import { FRAME_CREATED_AND_LOADED } from "frames/constants";
import { createTemporaryMessageHandler } from "utils/createTemporaryMessageHandler";

export const createSandboxedIframe = async (
  content: string,
  key: string,
): Promise<HTMLIFrameElement> => {
  const { body } = document;
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null so this is important to be done before anything else
  body.insertBefore(frame, body.firstElementChild);
  // Now set it's content to the specified
  const { contentDocument } = frame;
  if (contentDocument === null) throw new Error("frame not created correctly");
  // Harden it
  frame.setAttribute("sandbox", "");
  frame.setAttribute("name", key);
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  // FIXME: is there a case in which we could reject this promise?
  return new Promise((resolve: (frame: HTMLIFrameElement) => void): void => {
    createTemporaryMessageHandler(
      (source: Window, message?: string): boolean => {
        if (message === FRAME_CREATED_AND_LOADED) {
          resolve(frame);
          // This means, we're done and don't need the handler anymore
          return true;
        } else {
          // This means do not remove the handler yet
          return false;
        }
      },
    );
  });
};
