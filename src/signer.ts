import { Msg, StdFee, StdSignature } from "@cosmjs/launchpad";
import {
  CUSTODIAN_AUTH_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_READY_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
} from "frames/constants";
import content from "templates/custodian.html";
import { ActionType } from "types/actionType";
import { Application } from "types/application";
import { AuthEventDetail } from "types/authEventDetail";
import { CommonError } from "types/commonError";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { GoogleAuthInfo, isGoogleAuthInfo } from "types/gogoleAuthInfo";
import { GoogleAccessToken } from "types/googleAccessToken";
import { isErrorMessage, Message } from "types/message";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { Tx } from "types/tx";
import { createMessageCallback } from "utils/createMessageCallback";
import { createSandboxedIframe } from "utils/createSandboxedIframe";
import { isError } from "utils/isError";
import { sendMessage } from "utils/sendMessage";
import * as uuid from "uuid";

type EventHandler = (...args: any[]) => void;

type StateChangeHandlerFn = (state: SignerState, data?: any) => void;

export enum SignerState {
  Loading,
  ReadyToSignIn,
  Sandboxed,
  Authenticated,
  PreparingSigner,
  SignedOut,
  SignerReady,
  Authenticating,
  Failed,
  CancelledByUser,
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
  private custodianFrame: HTMLIFrameElement = null;
  private googleConfig: Application | null = null;
  private resolvers: { [id: string]: PromiseResolver } = {};
  private eventHandlers: {
    [event in Events]: (...args: any) => any;
  } = {
    [Events.StateChange]: undefined,
  };
  private setAuthButtonReady: () => void = (): void => {};
  private setAuthButtonNotInitialized: (
    error: Error | string,
  ) => void = (): void => {};

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
    const handlers: ReadonlyArray<StateChangeHandlerFn | undefined> = [
      this.eventHandlers[Events.StateChange],
    ];
    handlers.forEach((handler: StateChangeHandlerFn | undefined): void => {
      if (handler !== undefined) {
        // Call the handler for it
        handler(state, undefined);
      }
    });
  };

  /**
   * Core message handler to interact with the sandboxed frame(s)
   *
   * @param message The message that has to be handled
   *
   * Note: This method is deliberately implemented as an arrow function
   *       because it needs to have a well defined "this" object
   */
  private onMessageCallback = (message: Message<RootActions>): void => {
    if (message.target !== "Root") {
      throw new Error("this type of message should never reach this window");
    } else {
      switch (message.type) {
        case RootActions.Sandboxed:
          this.setState(SignerState.Sandboxed);
          break;
        case RootActions.SignerReady:
          this.setState(SignerState.SignerReady);
          break;
        case RootActions.SignedOut:
          this.setState(SignerState.SignedOut);
          break;
        case RootActions.SendSignature:
        case RootActions.SendAddress:
        case RootActions.SendIsMnemonicSafelyStored:
        case RootActions.SendShowMnemonicResult:
          this.forwardMessageToPromiseResolver(message);
          break;
        default:
          if (isErrorMessage(message)) {
            this.onError(message);
          }
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
  private onError = (message: Message<ErrorActions>): void => {
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
    return this.sendMessageAndPromiseToRespond<
      void,
      CustodianActions,
      GoogleAccessToken
    >({
      target: "Custodian",
      type: CustodianActions.Authenticated,
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
  private forwardMessageToPromiseResolver = (
    message: Message<RootActions>,
  ): void => {
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
  private sendMessageAndPromiseToRespond = <
    T,
    A extends ActionType,
    D = undefined
  >(
    message: Message<A, D>,
  ): Promise<T> => {
    const { custodianFrame } = this;
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
        sendMessage<A, D>(custodianFrame.contentWindow, {
          ...message,
          // With this we'll know to whom it goes
          uid: uid,
        });
      },
    );
  };

  /**
   * Handle authentication events
   * @param event The authentication event which is a custom event type that belongs to the
   *        gdrive-custodian code
   */
  private onAuthEvent = (
    event: CustomEvent<AuthEventDetail<GoogleAuthInfo | Error | string>>,
  ): void => {
    const { detail: eventData } = event;
    switch (eventData.type) {
      case CUSTODIAN_AUTH_STARTED_EVENT:
        this.setState(SignerState.Authenticating);
        break;
      case CUSTODIAN_AUTH_READY_EVENT:
        // Resolve the pending promise if it's there
        this.setAuthButtonReady();
        break;
      case CUSTODIAN_AUTH_SUCCEEDED_EVENT:
        if (isGoogleAuthInfo(eventData.data)) {
          const { accessToken } = eventData.data;
          this.initializeWallet(accessToken)
            .then((): void => {
              this.setState(SignerState.Authenticated);
            })
            .catch((error: any): void => {
              console.error(error);
              this.setState(SignerState.Failed);
            });
        }
        break;
      case CUSTODIAN_AUTH_FAILED_EVENT:
        if (isError(eventData.data)) {
          // FIXME: should do something with the error probably
          this.setState(SignerState.Failed);
          // reject(eventData.data);
        } else if (typeof eventData.data === "string") {
          if (eventData.data === "popup_closed_by_user") {
            this.setState(SignerState.CancelledByUser);
          } else {
            this.setState(SignerState.Failed);
          }
          this.setAuthButtonNotInitialized(eventData.data);
        } else {
          console.warn("unknown failure message");
        }
        break;
      case undefined:
        break;
      default:
        this.setState(SignerState.Failed);
    }
  };

  /**
   * This function initializes the whole flow that allows the user to authenticate with
   * Google and authorize the library to securely manage their mnemonic string
   *
   * @param application Google's configuration for OAuth + a button to attach to the sign-in flow
   */
  public connect = async (application: Application): Promise<void> => {
    this.setState(SignerState.Loading);
    // Export google config to the class level
    this.googleConfig = application;
    // Create the custodian window
    this.custodianFrame = await createSandboxedIframe(
      content,
      {
        signer: this.signerConfig,
        application: application,
      },
      "custodian",
      document.body,
    );
    const { contentWindow } = this.custodianFrame;
    if (typeof contentWindow.initialize === "function") {
      window.addEventListener("message", this.onMessage);
      // Start listening on the authentication events
      contentWindow.addEventListener(CUSTODIAN_AUTH_EVENT, this.onAuthEvent);
      // Call the window specialized initializer
      await contentWindow.initialize();
      // Reset the state now
      this.setState(SignerState.ReadyToSignIn);
    }
  };

  public disconnect = (): void => {
    const parent: HTMLElement = document.body;
    if (parent !== null) {
      // Remove the iframe from the body of the document
      parent.removeChild(this.custodianFrame);
    }
    // Remove listeners
    window.removeEventListener("message", this.onMessage);
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
  public signOut = (): void => {
    this.disconnect();
  };

  /**
   * Returns the address associated with the private
   * key
   */
  public getAddress = (): Promise<string> => {
    return this.sendMessageAndPromiseToRespond<string, SignerActions>({
      target: "Signer",
      type: SignerActions.GetAddress,
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
    const tx: Tx = {
      messages: messages,
      fee: fee,
      chainId: chainId,
      memo: memo,
      accountNumber: accountNumber,
      sequence: sequence,
    };
    return this.sendMessageAndPromiseToRespond<StdSignature, SignerActions, Tx>(
      {
        target: "Signer",
        type: SignerActions.SignTx,
        data: tx,
      },
    );
  };

  public async isMnemonicSafelyStored(): Promise<boolean> {
    return this.sendMessageAndPromiseToRespond<boolean, CustodianActions>({
      target: "Custodian",
      type: CustodianActions.GetIsMnemonicSafelyStored,
      data: null,
    });
  }

  public showMnemonic(path: string): Promise<boolean> {
    return this.sendMessageAndPromiseToRespond<
      boolean,
      CustodianActions,
      string
    >({
      target: "Custodian",
      type: CustodianActions.ShowMnemonic,
      data: path,
    });
  }
}
