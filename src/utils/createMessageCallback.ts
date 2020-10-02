import { isMessage, Message } from "../types/message";

export const createMessageCallback = (
  callback: (message: Message) => void
): ((event: MessageEvent) => void) => {
  return (event: MessageEvent): void => {
    const { data } = event;
    try {
      if (isMessage(data)) return callback(data);
      if (typeof data === "string") {
        const message: any = JSON.parse(data);
        // If this is not a message, discard it
        if (!isMessage(message)) return;
        // Otherwise, send it to the handler
        return callback(message);
      } else {
        // Simply ignore this
        console.log("ignoring this message: ", data);
      }
    } catch (error) {
      if (data.length > 0) {
        console.warn("MessageCallback error, invalid Json -> ", data);
      } else {
        // Empty message? wonder where it comes from
      }
    }
  };
};
