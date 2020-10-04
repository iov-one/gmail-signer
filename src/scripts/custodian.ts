import signer from "../templates/signer.html";
import { Message } from "../types/message";
import { createMessageCallback } from "../utils/createMessageCallback";
import { createSandboxedIframe } from "../utils/createSandboxedIframe";
import { sendMessage } from "../utils/sendMessage";
import { onAuthenticated } from "./custodian/handlers/onAuthenticated";
import { onSaveMnemonic } from "./custodian/handlers/onSaveMnemonic";
import { onSignOut } from "./custodian/handlers/onSignOut";
import { ChildContainer } from "./signer/childContainer";

const CHILD_CONTAINER: ChildContainer = new ChildContainer();

const handleMessage = async (message: Message): Promise<Message | null> => {
  const { data } = message;
  switch (message.type) {
    case "Authenticated":
      return onAuthenticated(data);
    case "SignOut":
      return onSignOut();
    case "SaveMnemonic":
      return onSaveMnemonic(data);
    default:
      console.warn("unknown message: " + message.type);
  }
};

const onMessage = async (message: Message): Promise<void> => {
  const { child } = CHILD_CONTAINER;
  switch (message.target) {
    case "Custodian":
      const response: Message | null = await handleMessage(message);
      if (response !== null) {
        if (response.target === "Signer") {
          sendMessage(child, {
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
            "sorry, I don't know this target: `" + response.target + "'"
          );
        }
      }
      break;
    case "Signer":
      // This message belongs to the child frame, so
      // we must redirect it
      if (child === null) {
        throw new Error(
          "cannot forward this message, not initialized properly"
        );
      }
      // Send as is, we don't want to use this
      return sendMessage(child, message);
    case "Root":
      return sendMessage(parent, message);
    default:
      throw new Error("unknown message type cannot be handled");
  }
};
window.onmessage = createMessageCallback(onMessage);

// Entry point for the custodian
window.onload = (): void => {
  const iframe: HTMLIFrameElement = createSandboxedIframe(signer);
  // Assign this here and get subsequent access to it
  CHILD_CONTAINER.child = iframe.contentWindow;
};
