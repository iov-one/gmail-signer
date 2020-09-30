import { Message } from "./types/message";
import { createMessageCallback } from "./utils/createMessageCallback";
import { createSandbox } from "./utils/createSandbox";
import { extractGoogleAuthToken } from "./utils/extractGoogleAuthToken";
import { openGoogleAuthorizationPopup } from "./utils/openGoogleAuthorizationPopup";
import { sendMessage } from "./utils/sendMessage";

let signer: Window | null;

export const connectButtonToSignInFlow = function (
  button: HTMLElement
): () => void {
  const handler = (): void => {
    if (signer === null) {
      throw new Error(
        "cannot send messages to the iframe, it was not created yet"
      );
    } else {
      openGoogleAuthorizationPopup();
    }
  };
  button.addEventListener("click", handler, true);
  return () => button.removeEventListener("click", handler, true);
};

const onSandboxMessage = createMessageCallback((message: Message): void => {
  if (message.type !== "Child") {
    throw new Error("this type of message should never reach this window");
  } else {
    switch (message.name) {
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

const onGoogleAuthenticationCompleted = (event: MessageEvent): void => {
  // Remove listener
  window.removeEventListener("message", onGoogleAuthenticationCompleted);
  // Create a new event listener for sandboxed children
  // messages
  window.addEventListener("message", onSandboxMessage);
  // Send authentication data to the GDrive frame
  sendAccessToken(event.data);
};

const sendAccessToken = (asString: string): void => {
  // Save it if it's not saved or update it anyway
  localStorage.setItem("/google/access-token", asString);
  // Send it to the Auth frame
  const message: Message = {
    type: "Auth",
    name: "Authenticated",
    data: JSON.parse(asString),
  };
  sendMessage(signer, message, location.origin);
};

const onAuthFrameReady = (event: MessageEvent): void => {
  const { data } = event;
  if (data === "AuthFrameReady") {
    const savedToken: string | null = localStorage.getItem(
      "/google/access-token"
    );
    // Check if we already own an access token
    if (savedToken === null) {
      // We only listen for 1 message
      window.addEventListener("message", onGoogleAuthenticationCompleted);
    } else {
      sendAccessToken(savedToken);
    }
  }
};

// Run this on startup
window.addEventListener("load", (): void => {
  const accessToken: GoogleAccessToken | boolean = extractGoogleAuthToken(
    location
  );
  if (accessToken === false) {
    // Without this, the loading spinner in the browser tab
    // will spin forever/very long time
    setTimeout((): void => {
      // Listen for the notification of the frame being ready
      window.addEventListener("message", onAuthFrameReady);
      // Create the sandbox
      signer = createSandbox();
    }, 0);
  } else {
    const { opener } = window;
    // Send back the result
    opener.postMessage(JSON.stringify(accessToken), "*");
    // Close me
    window.close();
  }
});
