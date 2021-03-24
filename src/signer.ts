import { Msg, StdFee, StdSignature } from "@cosmjs/launchpad";
import { GoogleAuthInfo } from "types/gogoleAuthInfo";
import * as uuid from "uuid";

import { GDriveApi } from "./frames/custodian/gDriveApi";
import content from "./templates/custodian.html";
import { Application } from "./types/application";
import { CommonError } from "./types/commonError";
import { GoogleAccessToken } from "./types/googleAccessToken";
import { Message } from "./types/message";
import { createMessageCallback } from "./utils/createMessageCallback";
import { createSandboxedIframe } from "./utils/createSandboxedIframe";
import { sendMessage } from "./utils/sendMessage";

type EventHandler = (...args: any[]) => void;

export enum SignerState {
  Loading,
  Sandboxed,
  Authenticated,
  PreparingSigner,
  SignedOut,
  SignerReady,
  Authenticating,
  Failed,
  CancelledByUser,
  AuthenticatorReady,
}

export interface SignerConfig {
  readonly authorization: {
    readonly path: string;
  };
}

export enum Events {
  StateChange = "statechange",
}

interface PromiseResolver {
  resolve: (...args: any[]) => void;
  reject: (error: CommonError) => void;
}

export class Signer {
  private readonly signerConfig: SignerConfig;
  private sandbox: HTMLIFrameElement = null;
  private googleConfig: Application | null = null;
  private resolvers: { [id: string]: PromiseResolver } = {};
  private eventHandlers: {
    [event in Events]: (...args: any) => any;
  } = {
    [Events.StateChange]: undefined,
  };

  constructor(config: SignerConfig) {
    this.signerConfig = config;
  }

  /**
   * Replaces current state and allows the UI to react upon the change
   *
   * @param state The new state that will replace the old
   *
   * @private
   */
  private setState = (state: SignerState): void => {
    const handler: (readyState: SignerState, data?: any) => void = this
      .eventHandlers[Events.StateChange];
    if (handler !== undefined) {
      // Call the handler for it
      handler(state, undefined);
    }
  };

  /**
   * Core message handler to interact with the sandboxed frame(s)
   *
   * @param message The message that has to be handled
   *
   * Note: This method is deliberately implemented as an arrow function
   *       because it needs to have a well defined "this" object
   */
  private onMessageCallback = async (message: Message): Promise<void> => {
    if (message.target !== "Root") {
      throw new Error("this type of message should never reach this window");
    } else {
      switch (message.type) {
        case "Sandboxed":
          this.setState(SignerState.Sandboxed);
          break;
        case "SignerReady":
          this.setState(SignerState.SignerReady);
          break;
        case "SendSignedTx":
          this.forwardMessageToPromiseResolver(message);
          break;
        case "SignedOut":
          this.setState(SignerState.SignedOut);
          break;
        case "SendAddress":
        case "SendIsMnemonicSafelyStored":
        case "SendShowMnemonicResult":
          this.forwardMessageToPromiseResolver(message);
          break;
        case "Error":
          this.onError(message);
          break;
      }
    }
  };

  private onMessage = createMessageCallback(this.onMessageCallback);

  /**
   * onError
   *
   * @param message
   *
   * @private
   */
  private onError = (message: Message): void => {
    const { uid } = message;
    if (uid !== undefined) {
      const resolver: PromiseResolver | undefined = this.getResolver(uid);
      if (resolver !== undefined) {
        resolver.reject(message.data);
      } else {
        console.warn(message.data);
      }
    } else {
      console.warn(message.data);
    }
  };

  /**
   * Initialize the wallet from the newly/saved access token that we just got
   *
   * @param accessToken The access token that we are going to use for authenticating gdrive calls
   *
   * @private
   */
  private initializeWallet = (
    accessToken: GoogleAccessToken,
  ): Promise<void> => {
    this.setState(SignerState.PreparingSigner);
    // Generate the message-promise
    return this.sendMessageAndPromiseToRespond({
      target: "Custodian",
      type: "Authenticated",
      data: accessToken,
    });
  };

  /**
   * Returns a promise resolver for a given uid if there exists one. These resolvers are only created
   * when calling `sendMessageAndPromiseToRespond`
   *
   * @param uuid The id of the message that will be resolved to a promise as soon as the response arrives,
   *             or an error occurs
   *
   * @private
   */
  private getResolver = (uuid: string): PromiseResolver | undefined => {
    if (uuid in this.resolvers) {
      const resolver: PromiseResolver = this.resolvers[uuid];
      delete this.resolvers[uuid];
      return resolver;
    } else {
      return undefined;
    }
  };

  /**
   * Forward the message to it's resolver, it must exist or we must throw
   *
   * @param message
   * @private
   */
  private forwardMessageToPromiseResolver = (message: Message): void => {
    const { uid } = message;
    if (uid === undefined) {
      console.warn(
        "received a message that requires a resolver but has no uid",
        message,
      );
    } else {
      const resolver: PromiseResolver | undefined = this.getResolver(uid);
      if (resolver === undefined) {
        // Just ignore, it's ok because this is a valid situation
        return;
      } else {
        // Now resolve the promise
        resolver.resolve(message.data);
        // Remove the resolver now
      }
    }
  };

  /**
   * Send a message and setup a promise resolver so that when there's a response
   * we can forward to response to the resolver and resolve/reject the promise
   *
   * @param message The message we are sending as a promise
   *
   * @private
   */
  private sendMessageAndPromiseToRespond = <T>(
    message: Message,
  ): Promise<T> => {
    const { sandbox } = this;
    const uid: string = uuid.v4();
    return new Promise<T>(
      (resolve: (value: T) => void, reject: (error: any) => void): void => {
        // Create a promise resolver that waits for responses
        // to this message
        //
        // TODO: we probably need a way to ensure that this happened and moreover
        //       make 100% sure that the promise was fulfilled
        this.resolvers[uid] = {
          resolve,
          reject,
        };
        sendMessage(sandbox.contentWindow, {
          ...message,
          // With this we'll know to whom it goes
          uid: uid,
        });
      },
    );
  };

  /**
   * This function initializes the whole flow that allows the user to authenticate with
   * Google and authorize the library to securely manage their mnemonic string
   *
   * @param application Google's configuration for OAuth
   */
  public connect = async (application: Application): Promise<void> => {
    this.setState(SignerState.Loading);
    // Listen to messages from the iframes before creating
    // them, because the existence of one of them is the first
    // message that is sent
    window.addEventListener("message", this.onMessage);
    // Create the custodian window
    this.sandbox = await createSandboxedIframe(
      content,
      {
        signer: this.signerConfig,
        application: application,
      },
      "custodian",
      document.body,
    );
    const { contentDocument } = this.sandbox;
    const onStarted = (): void => {
      this.setState(SignerState.Authenticating);
    };
    const onFailure = (event: Event): void => {
      const { detail: error } = event as CustomEvent;
      if (error === "popup_closed_by_user") {
        this.setState(SignerState.CancelledByUser);
      } else {
        this.setState(SignerState.Failed);
      }
    };
    const onSuccess = (rawEvent: Event): void => {
      const {
        detail: { accessToken },
      } = rawEvent as CustomEvent<GoogleAuthInfo>;
      this.setState(SignerState.Authenticated);
      this.initializeWallet(accessToken);
    };
    const onReady = (): void => {
      this.setState(SignerState.AuthenticatorReady);
    };
    contentDocument.addEventListener("auth-started", onStarted);
    contentDocument.addEventListener("auth-succeeded", onSuccess);
    contentDocument.addEventListener("auth-failed", onFailure);
    contentDocument.addEventListener("auth-ready", onReady);
    // Export google config to the class level
    this.googleConfig = application;
  };

  private disconnect = (): void => {
    const parent: HTMLElement = document.body;
    if (parent !== null) {
      // Remove the iframe from the body of the document
      parent.removeChild(this.sandbox);
    }
    // Remove listeners
    window.removeEventListener("message", this.onMessage);
  };

  /**
   * Locates and resizes the iframe in the specified rectangle
   *
   * @param rectangle
   */
  public locateAt = (rectangle: DOMRect): void => {
    const { style } = this.sandbox;
    const zIndex: number = Number.MAX_SAFE_INTEGER;

    style.position = "fixed";
    style.top = rectangle.top + "px";
    style.height = rectangle.height + "px";
    style.left = rectangle.left + "px";
    style.width = rectangle.width + "px";
    // Right behind the button
    style.zIndex = zIndex.toString();
  };

  /**
   * Set event listeners for the various types of events that are generated
   * during the flow
   *
   * @param event The name of the event that will be attached to the event handler
   * @param handler The handler that will be called when the event is generated
   *
   * Note: we allow one listener per event because as of now it does not make
   *       sense to have more than one listener per event.
   */
  public on = (event: Events, handler: EventHandler): void => {
    this.eventHandlers[event] = handler;
  };

  /**
   * Remove the event listener for this event
   *
   * @param event The name of the event to disconnect the listener from
   */
  public off = (event: Events): void => {
    if (event in this.eventHandlers) {
      delete this.eventHandlers[event];
    }
  };

  /**
   * This methods should be used to close Google's session
   */
  public signOut = async (): Promise<void> => {
    await this.sendMessageAndPromiseToRespond<string, CustodianActions>({
      target: "Custodian",
      type: CustodianActions.SignOut,
    });
    this.disconnect();
  };

  /**
   * Returns the address associated with the private
   * key
   */
  public getAddress = (): Promise<string> => {
    return this.sendMessageAndPromiseToRespond<string>({
      target: "Signer",
      type: "GetAddress",
    });
  };

  /**
   * Sign given set of messages
   *
   * @param messages The messages that the caller wants to sign
   * @param fee The fee of the transaction
   * @param chainId The chain id
   * @param memo The memo string (can be omitted)
   * @param accountNumber The account number (FIXME: it should be possible to compute this actually)
   * @param sequence The sequence number (FIXME: it should be also possible to compute this too)
   */
  public sign = (
    messages: Msg[],
    fee: StdFee,
    chainId: string,
    memo: string,
    accountNumber: string,
    sequence: string,
  ): Promise<StdSignature> => {
    return this.sendMessageAndPromiseToRespond<StdSignature>({
      target: "Signer",
      type: "SignTx",
      data: {
        messages: messages,
        fee: fee,
        chainId: chainId,
        memo: memo,
        accountNumber: accountNumber,
        sequence: sequence,
      },
    });
  };

  public getElement = (): HTMLElement => {
    return this.sandbox;
  };

  public async isMnemonicSafelyStored(): Promise<boolean> {
    return this.sendMessageAndPromiseToRespond<boolean>({
      target: "Custodian",
      type: "GetIsMnemonicSafelyStored",
      data: null,
    });
  }

  public hide(): void {
    const { sandbox } = this;
    sandbox.setAttribute("style", "display:none");
  }

  public showMnemonic(path: string): Promise<boolean> {
    return this.sendMessageAndPromiseToRespond({
      target: "Custodian",
      type: "ShowMnemonic",
      data: path,
    });
  }
}
