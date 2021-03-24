import { ActionType } from "types/actionType";
import { isMessage, Message } from "types/message";

export const createMessageCallback = <T extends ActionType, R = undefined>(
  handleMessage: (message: Message<T, R>) => void | Promise<void>,
): ((event: MessageEvent) => void) => {
  return (event: MessageEvent): void | Promise<void> => {
    if (event.origin !== location.origin) return;
    if (event.source === window) {
      // Messages from the same context are not allowed
      return;
    }
    const data = event.data as Message<T, R>;
    // If it's not a message we don't call the handler
    if (isMessage(data)) {
      return handleMessage(data);
    }
  };
};
