import { SignerConfig } from "../signer";
import signer from "../templates/signer.html";
import { GoogleAccessToken } from "../types/googleAccessToken";
import { Message } from "../types/message";
import { createMessageCallback } from "../utils/createMessageCallback";
import { createSandboxedIframe } from "../utils/createSandboxedIframe";
import { sendMessage } from "../utils/sendMessage";
import { onAbandon } from "./custodian/handlers/onAbandon";
import { onAuthenticated } from "./custodian/handlers/onAuthenticated";
import { onDeleteAccount } from "./custodian/handlers/onDeleteAccount";
import { onSignOut } from "./custodian/handlers/onSignOut";
import { ChildContainer } from "./signer/childContainer";

const CHILD_CONTAINER: ChildContainer = new ChildContainer();

declare global {
  interface Window {
    accessToken: GoogleAccessToken;
    signerConfig: SignerConfig;
  }
}

const handleMessage = async (message: Message): Promise<Message | null> => {
  const { data } = message;
  switch (message.type) {
    case "Authenticated":
      window.accessToken = data;
      try {
        return await onAuthenticated();
      } catch (error: any) {
        window.accessToken = null;
        return {
          target: "Root",
          type: "Error",
          data: error,
        };
      }
    case "DeleteAccount":
      return onDeleteAccount();
    case "SignOut":
      return onSignOut();
    case "Abandon":
      return onAbandon();
    default:
      console.warn("unknown message: " + message.type);
  }
};

const onSignerMessage = async (message: Message): Promise<void> => {
  const { child } = CHILD_CONTAINER;
  // This message belongs to the child frame, so
  // we must redirect it
  if (child === null) {
    throw new Error("cannot forward this message, not initialized properly");
  }
  // Send as is, we don't want to use this
  return sendMessage(child.contentWindow, message);
};

const onCustodianMessage = async (message: Message): Promise<void> => {
  const { child } = CHILD_CONTAINER;
  const response: Message | null = await handleMessage(message);
  if (response !== null) {
    if (response.target === "Signer") {
      sendMessage(child.contentWindow, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    } else if (response.target === "Root") {
      sendMessage(parent, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    } else {
      throw new Error(
        "sorry, I don't know this target: `" + response.target + "'",
      );
    }
  }
};

const onMessage = async (message: Message): Promise<void> => {
  switch (message.target) {
    case "Custodian":
      return onCustodianMessage(message);
    case "Signer":
      return onSignerMessage(message);
    case "Root":
      return sendMessage(parent, message);
    default:
      throw new Error("unknown message type cannot be handled");
  }
};

window.onmessage = createMessageCallback(onMessage);
window.onload = (): void => {
  CHILD_CONTAINER.child = createSandboxedIframe(signer, window.signerConfig);
};
