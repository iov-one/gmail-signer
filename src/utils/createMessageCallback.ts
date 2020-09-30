import { Message, isMessage } from "../types/message";

export const createMessageCallback = (
  callback: (message: Message) => void
): ((event: MessageEvent) => void) => {
  return (event: MessageEvent): void => {
    try {
      const message: any = JSON.parse(event.data);
      // If this is not a message, discard it
      if (!isMessage(message)) return;
      // Otherwise, send it to the handler
      return callback(message);
    } catch (error) {
      console.log("bad-json", event.data);
    }
  };
};
