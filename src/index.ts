import { Message } from "./types/message";
import { createMessageCallback } from "./utils/createMessageCallback";
import { createSandbox } from "./utils/createSandbox";
import { getAccessTokenFromRedirectUrl } from "./utils/getAccessTokenFromRedirectUrl";
import { openGoogleAuthorizationPopup } from "./utils/openGoogleAuthorizationPopup";
import { sendMessage } from "./utils/sendMessage";

let signer: Window | null;

export const connectButtonToSignInFlow = function (
  button: HTMLElement
): () => void {
  // Now the click handler
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
  if (message.target !== "Root") {
    throw new Error("this type of message should never reach this window");
  } else {
    switch (message.type) {
      case "CustodianReady":
        return onCustodianReady();
      case "Authenticated":
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

const onAccessTokenReceived = (accessToken: GoogleAccessToken): void => {
  // Save it if it's not saved or update it anyway
  localStorage.setItem("/google/access-token", JSON.stringify(accessToken));
  // Send it to the Auth frame
  const message: Message = {
    target: "Custodian",
    type: "Authenticated",
    data: accessToken,
  };
  // Create a new event listener for sandboxed children
  // messages
  // Now sed the access token to the Custodian
  sendMessage(signer, message, location.origin);
};

const onCustodianReady = function (): void {
  // Process the incoming message
  const savedToken: string | null = localStorage.getItem(
    "/google/access-token"
  );
  // Check if we already own an access token
  if (savedToken !== null) {
    // FIXME: ideally we should request disabling the button
    //        waiting for this
    // If we do have it, just initialize the rest
    // without prompting the user
    try {
      const accessToken: GoogleAccessToken = JSON.parse(savedToken);
      // Use saved token
      onAccessTokenReceived(accessToken);
    } catch {
      // Just do nothing
    }
  }
};

// Run this on startup
window.addEventListener("load", (): void => {
  const accessToken:
    | GoogleAccessToken
    | boolean = getAccessTokenFromRedirectUrl(location);
  // This is always used
  window.addEventListener("message", onSandboxMessage);
  // Check if there's a token already
  if (accessToken === false) {
    // Without this, the loading spinner in the browser tab
    // will spin forever/very long time
    setTimeout((): void => {
      // Create the sandbox
      signer = createSandbox();
    }, 0);
  } else {
    const { opener } = window;
    // Send back the result
    sendMessage(opener, {
      target: "Root",
      type: "Authenticated",
      data: accessToken,
    });
    // Close me
    window.close();
  }
});
