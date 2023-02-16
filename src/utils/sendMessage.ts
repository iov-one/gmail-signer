import { ActionType } from "../types/actionType";
import {
  isCustodianMessage,
  isRootMessage,
  isSignerMessage,
  Message,
} from "../types/message";

export const sendMessage = <A extends ActionType, T = undefined>(
  recipient: Window,
  message: Message<A, T>,
  origin = location.origin,
): void => {
  if (recipient === null) {
    console.warn("attempting to send a message to a null window");
  }
  switch (message.target) {
    case "Custodian":
      if (!isCustodianMessage(message)) {
        throw new Error("Sending a non custodian message to the custodian");
      }
      break;
    case "Signer":
      if (!isSignerMessage(message)) {
        throw new Error("Sending a non signer message to the signer");
      }
      break;
    case "Root":
      if (!isRootMessage(message)) {
        throw new Error("Sending a non root message to the root");
      }
      break;
  }
  recipient.postMessage(message, origin);
};
