import { Message } from "../types/message";

export const sendMessage = (
  recipient: Window,
  message: Message,
  origin = "*",
) => {
  if (recipient === null) {
    console.warn("attempting to send a message to a null window");
  }
  recipient.postMessage(message, origin);
};
