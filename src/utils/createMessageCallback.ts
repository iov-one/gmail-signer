import { isMessage, Message } from "../types/message";

export const createMessageCallback = (
  callback: (message: Message) => Promise<void>,
): ((event: MessageEvent) => void) => {
  return function (event: MessageEvent): Promise<void> {
    const { data } = event;
    try {
      if (isMessage(data)) return callback(data);
      // The only case in which we are interested when it's not a
      // valid local message, is when it's string. We then try to
      // convert it to a message and call the function again
      if (typeof data === "string") {
        // Convert to object and call self again
        return this.apply(this, JSON.parse(data));
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
