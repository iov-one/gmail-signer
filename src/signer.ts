import * as uuid from "uuid";
import { Application } from "..";
import { onAccessTokenReceived } from "./events/onAccessTokenReceived";
import { onCustodianReady } from "./events/onCustodianReady";
import content from "./templates/custodian.html";
import { CommonError } from "./types/commonError";
import { Message } from "./types/message";
import { createMessageCallback } from "./utils/createMessageCallback";
import { createSandboxedIframe } from "./utils/createSandboxedIframe";
import { sendMessage } from "./utils/sendMessage";
import { startGoogleAuthentication } from "./utils/startGoogleAuthentication";

type EventHandler = (...args: any[]) => void;

export enum ReadyState {
  Loading,
  Ready,
  Authenticated,
  SignedOut,
  SignedIn,
  NeedsToCreateMnemonic,
}

export enum Events {
  ReadyStateChange = "readystatechange",
}

interface PromiseResolver {
  resolve: (...args: any[]) => void;
  reject: (error: CommonError) => void;
}

export class Signer {
  private sandbox: Window = null;
  private config: Application | null = null;
  private promiseResolvers: { [id: string]: PromiseResolver } = {};
  private eventHandlers: {
    [event in Events]: (...args: any) => any;
  } = {
    [Events.ReadyStateChange]: undefined,
  };

  private setReadyState(readyState: ReadyState): void {
    const handler: (readyState: ReadyState, data?: any) => void = this
      .eventHandlers[Events.ReadyStateChange];
    if (handler !== undefined) {
      // Call the handler for it
      handler(readyState, undefined);
    }
  }

  /**
   * Core message handler to interact with the sandboxed frame(s)
   *
   * @param message The message that has to be handled
   *
   * Note: This method is deliberately implemented as an arrow function
   *       because it needs to have a well defined "this" object
   */
  private onMessage = async (message: Message): Promise<void> => {
    if (message.target !== "Root") {
      throw new Error("this type of message should never reach this window");
    } else {
      console.log(message);
      switch (message.type) {
        case "Ready":
          this.setReadyState(ReadyState.Ready);
          // Try to auto-authenticate
          return onCustodianReady(this.sandbox);
        case "Authenticated":
          this.setReadyState(ReadyState.Authenticated);
          return onAccessTokenReceived(this.sandbox, message.data);
        case "SignerReady":
          this.setReadyState(ReadyState.SignedIn);
          break;
        case "RequestMnemonicCreation":
          this.setReadyState(ReadyState.NeedsToCreateMnemonic);
          break;
        case "SignedOut":
          this.setReadyState(ReadyState.SignedOut);
          break;
        case "SendAddress":
          this.forwardMessageToPromiseResolver(message);
          break;
        case "Error":
          this.onError(message);
          break;
      }
    }
  };

  private onError(message: Message): void {
    const { uid } = message;
    if (uid !== undefined) {
      const resolver: PromiseResolver | undefined = this.promiseResolvers[uid];
      if (resolver !== undefined) {
        resolver.reject(message.data);
      } else {
        console.warn(message.data);
      }
    } else {
      console.warn(message.data);
    }
  }

  /**
   * Create a message listener function that has access to `this'.
   *
   * This will listen to all messages sent to the root window, and act according
   * to the type of message.
   *
   * @private
   */
  private createMessageListener(): (event: MessageEvent) => void {
    return createMessageCallback(this.onMessage);
  }

  /**
   * Start the google authentication flow
   */
  public signIn = (): void => {
    const configuration: Application | null = this.config;
    if (configuration === null) {
      throw new Error(
        "cannot access google's configuration, so cannot create the authentication modal"
      );
    }
    if (this.sandbox === null) {
      throw new Error(
        "cannot send messages to the iframe, it was not created yet"
      );
    } else {
      // The user has decided to authenticate, so let's do that
      startGoogleAuthentication(configuration);
    }
  };

  /**
   * Forward the message to it's resolver, it must exist or we must throw
   *
   * @param message
   * @private
   */
  private forwardMessageToPromiseResolver(message: Message) {
    if (message.uid === undefined) {
      console.warn("received message that requires a resolver but has no uid");
    } else {
      const resolver: PromiseResolver = this.promiseResolvers[message.uid];
      if (resolver === undefined) {
        throw new Error(
          "message with uid `" +
            message.uid +
            "' received and no resolver was setup for it"
        );
      } else {
        // Now resolve the promise
        resolver.resolve(message.data);
      }
    }
  }

  /**
   * Send a message and setup a promise resolver so that when there's a response
   * we can forward to response to the resolver and resolve/reject the promise
   *
   * @param resolve
   * @param reject
   * @param message
   *
   * @private
   */
  private sendMessageWithResolver(
    resolve: (...args: any[]) => void,
    reject: (error: any) => void,
    message: Message
  ): void {
    const uid: string = uuid.v4();
    this.promiseResolvers[uid] = {
      resolve,
      reject,
    };
    sendMessage(this.sandbox, {
      ...message,
      // With this we'll know to whom it goes
      uid: uid,
    });
  }

  /**
   * This function initializes the whole flow that allows the user to authenticate with
   * Google and authorize the library to securely manage their mnemonic string
   *
   * @param application Google's configuration for OAuth
   */
  public connect(application: Application): () => void {
    this.setReadyState(ReadyState.Loading);
    // Listen to messages from the iframes before creating
    // them, because the existence of one of them is the first
    // message that is sent
    window.addEventListener("message", this.createMessageListener());
    // Create the signer window
    const iframe = createSandboxedIframe(content);
    this.sandbox = iframe.contentWindow;
    this.config = application;
    // Return a "cleanup" function to remove the listener and avoid leaks
    return () => {
      const parent: HTMLElement = iframe.parentElement;
      if (parent !== null) {
        parent.removeChild(iframe);
      }
      // Remove listeners
      window.removeEventListener("message", this.createMessageListener());
    };
  }

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
  public on(event: Events, handler: EventHandler): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Remove the event listener for this event
   *
   * @param event The name of the event to disconnect the listener from
   */
  public off(event: Events): void {
    if (event in this.eventHandlers) {
      delete this.eventHandlers[event];
    }
  }

  /**
   * This methods should be used to close Google's session
   */
  public signOut(): void {
    sendMessage(this.sandbox, {
      target: "Custodian",
      type: "SignOut",
    });
  }

  /**
   * Creates a new key for this user and saves it in GDrive
   */
  public createAndStoreKey(
    hdPath: string = "m/44'/234'/0'/0/0",
    prefix: string = "star"
  ): void {
    sendMessage(this.sandbox, {
      target: "Signer",
      type: "CreateAccount",
      data: {
        hdPath,
        prefix,
      },
    });
  }

  public async getAddress(): Promise<string> {
    return new Promise(
      (
        resolve: (address: string) => void,
        reject: (error: any) => void
      ): void => {
        this.sendMessageWithResolver(resolve, reject, {
          target: "Signer",
          type: "GetAddress",
        });
      }
    );
  }
}
