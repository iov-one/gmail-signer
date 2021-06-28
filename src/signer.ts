import {
  CUSTODIAN_AUTH_COMPLETED_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_READY_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
  CUSTODIAN_SIGN_IN_REQUEST,
} from "frames/constants";
import custodian from "templates/custodian.html";
import { ActionType } from "types/actionType";
import { CommonError } from "types/commonError";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { FrameDataListener } from "types/frameDataListener";
import { GenericMessage } from "types/genericMessage";
import { isErrorMessage, Message } from "types/message";
import { RootActions } from "types/rootActions";
import { Signable, SignResponse } from "types/signable";
import { SignerActions } from "types/signerActions";
import { SignRequest } from "types/signRequest";
import { createMessageCallback } from "utils/createMessageCallback";
import { createTemporaryMessageListener } from "utils/createTemporaryMessageListener";
import { isError } from "utils/isError";
import { sandboxFrame } from "utils/sandboxFrame";
import { sendMessage } from "utils/sendMessage";
import * as uuid from "uuid";

type StateChangeHandler = <T>(state: SignerState, data: T) => void;

export enum SignerState {
  Loading,
  ReadyToSignIn,
  SignatureRequestRejected,
  Sandboxed,
  Authenticated,
  SignedOut,
  SignerReady,
  Authenticating,
  AuthenticationCompleted,
  Failed,
  CancelledByUser,
  BlockedByBrowser,
  BrowserProbablyBlockingContent,
}

export interface SignerConfiguration {
  readonly authorization: {
    readonly path: string;
  };
  readonly googleClientID: string;
  readonly mnemonicLength: 12 | 24;
}

interface PromiseResolver {
  resolve: (...args: any[]) => void;
  reject: (error: CommonError) => void;
}

export class Signer {
  private readonly configuration: SignerConfiguration;
  private custodian: HTMLIFrameElement | null = null;
  private resolvers: { [id: string]: PromiseResolver } = {};
  private stateChangeListener?: StateChangeHandler;
  private setAuthButtonReady: () => void = (): void => {};
  private setAuthButtonNotInitialized: (error: Error | string) => void =
    (): void => {};

  constructor(config: SignerConfiguration) {
    this.configuration = config;
    window.addEventListener("message", this.onMessage);
  }

  /**
   * Create the iframe and attach it to the DOM
   */
  public async attach(): Promise<void> {
    // Provide the necessary information
    const cleanUp = createTemporaryMessageListener(
      new FrameDataListener(this.configuration),
    );
    // Sandbox the iframe
    try {
      this.custodian = await sandboxFrame(custodian, "custodian", [
        "allow-popups",
      ]);
    } finally {
      cleanUp();
    }
  }

  /**
   * Detach the iframe from the DOM
   */
  public detach(): void {
    const { custodian } = this;
    if (custodian !== null) {
      window.removeEventListener("message", this.onMessage);
      custodian.remove();
    }
  }

  /**
   * Replaces current state and allows the UI to react upon the change
   *
   * @param state The new state that will replace the old
   * @param data Data associated with the event if any
   *
   * @private
   */
  private setState = <T>(state: SignerState, data?: T): void => {
    const { stateChangeListener } = this;
    if (stateChangeListener !== undefined) {
      stateChangeListener(state, data);
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
          this.forwardMessageToPromiseResolver(message);
          this.setState(SignerState.SignedOut);
          break;
        case RootActions.SendSignature:
        case RootActions.SendAddress:
        case RootActions.SendPublicKey:
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
        delete this.resolvers[uid];
      }
    }
  };

  private getCustodianWindow(): Window {
    const { custodian } = this;
    if (custodian === null) {
      throw new Error("custodian frame not initialized");
    }
    if (custodian.contentWindow === null) {
      throw new Error("custodian frame has no window attached");
    }
    return custodian.contentWindow;
  }

  /**
   * Send a message and setup a promise resolver so that when there's a response
   * we can forward to response to the resolver and resolve/reject the promise
   *
   * @param message The message we are sending as a promise
   * @param timeout Time to wait for the response, < 0 means infinite
   *
   * @private
   */
  private sendMessageAndPromiseToRespond = <
    T,
    A extends ActionType,
    D = undefined,
  >(
    message: Message<A, D>,
    timeout = 4000,
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
        if (timeout > 0) {
          setTimeout((): void => {
            if (this.resolvers[uid]) {
              console.warn(
                `a resolver for ${uid} was not called within 4 seconds`,
              );
              delete this.resolvers[uid];
            }
          }, timeout);
        }
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
    message?: GenericMessage<any>,
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
        this.setState(SignerState.Authenticated, message.data);
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
          } else if (message.data === "popup_blocked_by_browser") {
            this.setState(SignerState.BlockedByBrowser);
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
   */
  public connect(button: HTMLElement): () => void {
    this.setState(SignerState.Loading);
    // Setup the actual sign in flow trigger and the actual event
    // handler
    const targetWindow: Window = this.getCustodianWindow();
    const requestSignIn = (): void => {
      targetWindow.postMessage(
        {
          type: CUSTODIAN_SIGN_IN_REQUEST,
        },
        location.origin,
      );
    };
    // Start listening on the authentication events
    const cleanUp = createTemporaryMessageListener<GenericMessage>(
      this.onAuthEvent,
    );
    button.addEventListener("click", requestSignIn);
    // Reset the state now
    this.setState(SignerState.ReadyToSignIn);
    // Return the cancellable thing now
    // Prepare the promise to be cancelled
    return (): void => {
      button.removeEventListener("click", requestSignIn);
      cleanUp();
    };
  }

  /**
   * Set state change handler
   *
   * @param handler The handler that will be called when the event is generated
   *
   * Note: we allow one listener per event because as of now it does not make
   *       sense to have more than one listener per event.
   */
  public setStateChangeListener = (handler: StateChangeHandler): void => {
    this.stateChangeListener = handler;
  };

  /**
   * Remove the event listener for this event
   */
  public removeStateChangeListener = (): void => {
    this.stateChangeListener = undefined;
  };

  /**
   * This methods should be used to close Google's session
   */
  public signOut = async (): Promise<void> => {
    await this.sendMessageAndPromiseToRespond<string, CustodianActions>({
      target: "Custodian",
      type: CustodianActions.SignOut,
    });
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
   * Sign a signable object
   *
   * @param signable The signable object which can be a amino StdSignDoc or a stargate SignDoc
   */
  public sign = (signable: Signable): Promise<SignResponse> => {
    const { authorization } = this.configuration;

    return this.sendMessageAndPromiseToRespond<
      SignResponse,
      SignerActions,
      SignRequest
    >(
      {
        target: "Signer",
        type: SignerActions.SignTx,
        data: {
          signable: signable,
          authorizationPath: authorization.path,
        },
      },
      -1 /* We need to wait forever */,
    );
  };

  public async getPublicKey(): Promise<string> {
    return this.sendMessageAndPromiseToRespond<string, SignerActions>({
      target: "Signer",
      type: SignerActions.GetPublicKey,
    });
  }

  /**
   * Return whether the user has confirmed saving the mnemonic phrase in a safe
   * location or physically
   */
  public async isMnemonicSafelyStored(): Promise<boolean> {
    return this.sendMessageAndPromiseToRespond<boolean, CustodianActions>({
      target: "Custodian",
      type: CustodianActions.GetIsMnemonicSafelyStored,
      data: undefined,
    });
  }

  /**
   * Request the library to display the mnemonic phrase at the specified [path]
   *
   * The specified route must contain certain elements with specific attributes
   * that will be looked up and populated by the library
   *
   * @param path The route in your application which would render the mnemonic
   *             phrase
   */
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
