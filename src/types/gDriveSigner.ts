import { onAccessTokenReceived } from "../main/events/onAccessTokenReceived";
import { onCustodianReady } from "../main/events/onCustodianReady";
import signer from "../templates/signer.html";
import { createMessageCallback } from "../utils/createMessageCallback";
import { createSandboxedIframe } from "../utils/createSandboxedIframe";
import { startGoogleAuthentication } from "../utils/startGoogleAuthentication";
import { GoogleConfiguration } from "./googleConfiguration";
import { Message } from "./message";

export enum GDriveSignerState {}

type EventName = "statechange";

export class GDriveSigner {
  private signerWindow: Window = null;
  private button: HTMLElement | null = null;
  private googleConfiguration: GoogleConfiguration | null = null;

  constructor() {
    // This listens to all messages coming from both iframes
    window.addEventListener("message", this.createMessageListener());
  }

  /**
   * The message handler would set the signer window when
   * @param window The window of the sandboxed iframe that has the signing code
   *
   * @private
   */
  private setSignerWindow(window: Window): void {
    const { button } = this;
    this.signerWindow = window;
    if (window !== null && button !== null) {
      // FIXME: use the state change callback for these
      button.removeAttribute("disabled");
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
    return createMessageCallback((message: Message): void => {
      if (message.target !== "Root") {
        throw new Error("this type of message should never reach this window");
      } else {
        switch (message.type) {
          case "CustodianReady":
            this.setSignerWindow(message.data);
            // Try to auto-authenticate
            return onCustodianReady();
          case "Authenticated":
            // Now notify the child
            return onAccessTokenReceived(message.data);
          case "SignerReady":
            console.log("Yay! signer is ready...");
            break;
          case "RequestMnemonicCreation":
            console.log("You need to create a new wallet");
            break;
          case "Error":
            break;
        }
      }
    });
  }

  /**
   * Sign-In button click handler
   *
   * @private
   */
  private onSignInButtonClicked = () => {
    const configuration: GoogleConfiguration | null = this.googleConfiguration;
    if (configuration === null) {
      throw new Error(
        "cannot access google's configuration, so cannot create the authentication modal"
      );
    }
    if (this.signerWindow === null) {
      throw new Error(
        "cannot send messages to the iframe, it was not created yet"
      );
    } else {
      // The user has decided to authenticate, so let's do that
      startGoogleAuthentication(configuration);
    }
  };

  /**
   * This function initializes the whole flow that allows the user to authenticate with
   * Google and authorize the library to securely manage their mnemonic string
   *
   * @param button The button on which clicking will trigger the authentication flow
   * @param configuration Google's configuration for OAuth
   */
  public setSignInButton(
    button: HTMLElement,
    configuration: GoogleConfiguration
  ): () => void {
    // Create the signer window
    this.signerWindow = createSandboxedIframe(signer, [
      "allow-scripts",
      "allow-popups",
    ]);
    this.googleConfiguration = configuration;
    this.button = button;
    // FIXME: this should be managed via callbacks
    button.setAttribute("disabled", "disabled");
    // Install the event listener that we're going to remove by calling
    // the function returned from here
    button.addEventListener("click", this.onSignInButtonClicked);
    // Return a "cleanup" function to remove the listener and avoid leaks
    return () =>
      button.removeEventListener("click", this.onSignInButtonClicked);
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
  public on(event: EventName, handler: (...args: any) => void) {
    console.log(event);
  }

  /**
   * Remove the event listener for this event
   *
   * @param event The name of the event to disconnect the listener from
   */
  public off(event: EventName) {
  }
}
