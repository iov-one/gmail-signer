import {
  FRAME_GET_SPECIFIC_DATA,
  FRAME_SEND_SPECIFIC_DATA,
} from "frames/constants";
import { GenericMessage } from "types/genericMessage";
import { createTemporaryMessageListener } from "utils/createTemporaryMessageListener";

export const getFrameSpecificData = async <T>(): Promise<T> => {
  // FIXME: should reject if we don't get the message in a certain time?
  return new Promise(
    (resolve: (value: T) => void, reject: (error: any) => void): void => {
      const timer = setTimeout((): void => {
        reject(new Error("timed out waiting for the frame data"));
      }, 3000);
      createTemporaryMessageListener(
        (source: Window, message?: GenericMessage<T>): boolean => {
          if (message === undefined) {
            reject(
              new Error(
                "invalid message received as a response for frame specific data",
              ),
            );
          } else if (message.type === FRAME_SEND_SPECIFIC_DATA) {
            // Avoid timed rejection
            clearTimeout(timer);
            // Now finally resolve
            resolve(message.data);
            return true;
          }
          return false;
        },
      );
      parent.postMessage(FRAME_GET_SPECIFIC_DATA, location.origin);
    },
  );
};
