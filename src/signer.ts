import * as uuid from "uuid";
import { onAccessTokenReceived } from "./events/onAccessTokenReceived";
import { onCustodianReady } from "./events/onCustodianReady";
import content from "./templates/custodian.html";
import { Application } from "./types/application";
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
  private sandbox: HTMLIFrameElement = null;
  private config: Application | null = null;
  private resolvers: { [id: string]: PromiseResolver } = {};
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

  private showSandbox(): void {
    const { style } = this.sandbox;
    // Set visible for a moment
    style.display = "initial";
  }

  private hideSandbox(): void {
    const { style } = this.sandbox;
    // Set visible for a moment
    style.display = "none";
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
    const { sandbox } = this;
    if (message.target !== "Root") {
      throw new Error("this type of message should never reach this window");
    } else {
      switch (message.type) {
        case "Ready":
          this.setReadyState(ReadyState.Ready);
          // Try to auto-authenticate
          return onCustodianReady(sandbox.contentWindow);
        case "Authenticated":
          this.setReadyState(ReadyState.Authenticated);
          return onAccessTokenReceived(sandbox.contentWindow, message.data);
        case "ShowModal":
          this.showSandbox();
          break;
        case "ModalDismissed":
          this.hideSandbox();
          break;
        case "SignerReady":
          this.setReadyState(ReadyState.SignedIn);
          break;
        case "SendSignedTx":
          this.forwardMessageToPromiseResolver(message);
          break;
        case "RequestMnemonicCreation":
          this.setReadyState(ReadyState.NeedsToCreateMnemonic);
          this.forwardMessageToPromiseResolver(message);
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

  /**
   * onError
   *
   * @param message
   *
   * @private
   */
  private onError(message: Message): void {
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

  private getResolver(uuid: string): PromiseResolver | undefined {
    if (uuid in this.resolvers) {
      const resolver: PromiseResolver = this.resolvers[uuid];
      delete this.resolvers[uuid];
      return resolver;
    } else {
      return undefined;
    }
  }

  /**
   * Forward the message to it's resolver, it must exist or we must throw
   *
   * @param message
   * @private
   */
  private forwardMessageToPromiseResolver(message: Message): void {
    const { uid } = message;
    if (uid === undefined) {
      console.warn("received message that requires a resolver but has no uid");
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
  }

  /**
   * Send a message and setup a promise resolver so that when there's a response
   * we can forward to response to the resolver and resolve/reject the promise
   *
   * @param message The message we are sending as a promise
   *
   * @private
   */
  private sendMessageAndPromiseToRespond<T>(message: Message): Promise<T> {
    const { sandbox } = this;
    const uid: string = uuid.v4();
    return new Promise<T>(
      (resolve: (address: T) => void, reject: (error: any) => void): void => {
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
      }
    );
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
    this.sandbox = createSandboxedIframe(content);
    this.config = application;
    // Return a "cleanup" function to remove the listener and avoid leaks
    return () => {
      const { body } = document;
      // Remove the iframe from the body of the document
      body.removeChild(this.sandbox);
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
    const { sandbox } = this;
    sendMessage(sandbox.contentWindow, {
      target: "Custodian",
      type: "SignOut",
    });
  }

  /**
   * Creates a new key for this user and saves it in GDrive
   */
  public async createAndStoreKey(
    hdPath: string = "m/44'/234'/0'/0/0",
    prefix: string = "star"
  ): Promise<void> {
    const { sandbox } = this;
    return this.sendMessageAndPromiseToRespond({
      target: "Signer",
      type: "CreateAccount",
      data: {
        hdPath,
        prefix,
      },
    });
  }

  public async getAddress(): Promise<string> {
    return this.sendMessageAndPromiseToRespond<string>({
      target: "Signer",
      type: "GetAddress",
    });
  }

  public async signTx(tx: any): Promise<any> {
    return this.sendMessageAndPromiseToRespond<any>({
      target: "Signer",
      type: "SignTx",
      data: tx,
    });
  }

  public async deleteAccount(): Promise<void> {
    return this.sendMessageAndPromiseToRespond({
      target: "Custodian",
      type: "DeleteAccount",
    });
  }
}
