import { Message } from "../types/message";

export const sendMessage = (
  recipient: Window,
  message: Message,
  origin = "*"
) => {
  recipient.postMessage(JSON.stringify(message), origin);
};
