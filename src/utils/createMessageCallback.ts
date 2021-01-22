import { isMessage, Message } from "../types/message";

export const createMessageCallback = (
  callback: (message: Message) => Promise<void>,
): ((event: MessageEvent) => void) => {
  return function (event: MessageEvent): Promise<void> {
    if (event.origin !== location.origin) return;
    if (event.source === window) {
      // Messages from the same context are not allowed
      return;
    }
    const { data } = event;
    if (isMessage(data)) return callback(data);
    // The only case in which we are interested when it's not a
    // valid local message, is when it's string. We then try to
    // convert it to a message and call the function again
    if (typeof data === "string") {
      try {
        const object = JSON.parse(data);
        // Convert to object and call self again
        return this.apply(this, object);
      } catch (error) {
        return;
      }
    }
  };
};
