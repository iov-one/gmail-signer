import { Msg, StdFee, StdSignature } from "@cosmjs/launchpad";
import {
  CUSTODIAN_AUTH_COMPLETED_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_READY_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
  CUSTODIAN_SIGN_IN_REQUEST,
  FRAME_GET_SPECIFIC_DATA,
  FRAME_SEND_SPECIFIC_DATA,
} from "frames/constants";
import content from "templates/custodian.html";
import { ActionType } from "types/actionType";
import { CommonError } from "types/commonError";
import { Config } from "types/config";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { GenericMessage } from "types/genericMessage";
import { isErrorMessage, Message } from "types/message";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { Tx } from "types/tx";
import { createMessageCallback } from "utils/createMessageCallback";
import { createSandboxedIframe } from "utils/createSandboxedIframe";
import { createTemporaryMessageHandler } from "utils/createTemporaryMessageHandler";
import { isError } from "utils/isError";
import { sendMessage } from "utils/sendMessage";
import * as uuid from "uuid";

type EventHandler = (...args: any[]) => void;

type StateChangeHandlerFn = (state: SignerState) => void;

export enum SignerState {
  Loading,
  ReadyToSignIn,
  Sandboxed,
  Authenticated,
  PreparingSigner,
  SignedOut,
  SignerReady,
  Authenticating,
  AuthenticationCompleted,
  Failed,
  CancelledByUser,
  BrowserProbablyBlockingContent,
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
  private custodianFrame: HTMLIFrameElement | null = null;
  private config: Config | null = null;
  private resolvers: { [id: string]: PromiseResolver } = {};
  private eventHandlers: {
    [event in Events]?: (...args: any) => any;
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
        handler(state);
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
  private onError = (message: Message<ErrorActions, CommonError>): void => {
    const { uid } = message;
    if (uid !== undefined) {
      const resolver: PromiseResolver | undefined = this.getResolver(uid);
      if (resolver !== undefined) {
        if (message.data !== undefined) {
          resolver.reject(message.data);
        } else {
          resolver.reject({
            message: "unknown error",
            data: message.data,
          });
        }
      } else {
        console.warn(message.data);
      }
    } else {
      console.warn(message.data);
    }
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

  private getCustodianWindow(): Window {
    const { custodianFrame } = this;
    if (custodianFrame === null) {
      throw new Error("custodian frame not initialized");
    }
    if (custodianFrame.contentWindow === null) {
      throw new Error("custodian frame has no window attached");
    }
    return custodianFrame.contentWindow;
  }

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
    const uid: string = uuid.v4();
    const targetWindow: Window = this.getCustodianWindow();
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
        sendMessage<A, D>(targetWindow, {
          ...message,
          // With this we'll know to whom it goes
          uid: uid,
        });
      },
    );
  };

  /**
   * Handle authentication events
   * @param source The source window which sent the message
   * @param message The message sent by the authenticator (sometimes has the auth data)
   */
  private onAuthEvent = (
    source: Window,
    message?: GenericMessage<string | undefined>,
  ): boolean => {
    const custodianWindow = this.getCustodianWindow();
    if (source !== custodianWindow || message === undefined) {
      // Just ignore it, it's not for us
      return false;
    }
    switch (message.type) {
      case CUSTODIAN_AUTH_STARTED_EVENT:
        this.setState(SignerState.Authenticating);
        break;
      case CUSTODIAN_AUTH_COMPLETED_EVENT:
        this.setState(SignerState.AuthenticationCompleted);
        break;
      case CUSTODIAN_AUTH_READY_EVENT:
        // Resolve the pending promise if it's there
        this.setAuthButtonReady();
        break;
      case CUSTODIAN_AUTH_SUCCEEDED_EVENT:
        this.setState(SignerState.Authenticated);
        return true;
      case CUSTODIAN_AUTH_FAILED_EVENT:
        if (isErrorMessage(message)) {
          this.setState(SignerState.Failed);
        } else if (isError(message.data)) {
          // FIXME: should do something with the error probably
          this.setState(SignerState.Failed);
        } else if (typeof message.data === "string") {
          if (message.data === "popup_closed_by_user") {
            this.setState(SignerState.CancelledByUser);
          } else if (message.data === "user_logged_out") {
            // Interesting: means that the user didn't actually login
            this.setState(SignerState.BrowserProbablyBlockingContent);
          } else {
            this.setState(SignerState.Failed);
          }
          this.setAuthButtonNotInitialized(message.data);
        } else {
          console.error(message);
        }
        return true;
      case undefined:
        break;
      default:
        this.setState(SignerState.Failed);
    }
    return false;
  };

  /**
   * This function initializes the whole flow that allows the user to authenticate with
   * Google and authorize the library to securely manage their mnemonic string
   *
   * @param button The button which when clicked would trigger a sign-in flow
   * @param config Google's configuration for OAuth + a button to attach to the sign-in flow
   */
  public connect = async (
    button: HTMLElement,
    config: Config,
  ): Promise<void> => {
    this.setState(SignerState.Loading);
    // Export google config to the class level
    this.config = config;
    // This handler just expects the created window
    createTemporaryMessageHandler((source: Window, data?: string): boolean => {
      if (data === FRAME_GET_SPECIFIC_DATA) {
        source.postMessage(
          {
            type: FRAME_SEND_SPECIFIC_DATA,
            data: {
              clientID: config.clientID,
            },
          },
          location.origin,
        );
        return true;
      }
      return false;
    });
    // Create the custodian window
    this.custodianFrame = await createSandboxedIframe(content, "custodian", [
      "allow-popups",
    ]);
    // Setup the actual sign in flow trigger and the actual event
    // handler
    const targetWindow: Window = this.getCustodianWindow();
    // On clicking the button, ask the custodian to sign in
    button.addEventListener("click", (): void => {
      targetWindow.postMessage(
        {
          type: CUSTODIAN_SIGN_IN_REQUEST,
        },
        location.origin,
      );
    });
    // Start listening on the authentication events
    createTemporaryMessageHandler<GenericMessage<string | undefined>>(
      this.onAuthEvent,
    );
    // Listen to messages too
    window.addEventListener("message", this.onMessage);
    // Reset the state now
    this.setState(SignerState.ReadyToSignIn);
  };

  public disconnect = (): void => {
    const parent: HTMLElement = document.body;
    if (parent !== null && this.custodianFrame !== null) {
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
      data: undefined,
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
