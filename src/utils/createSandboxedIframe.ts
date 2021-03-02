import { FRAME_CREATED_AND_LOADED } from "frames/constants";
import { createTemporaryMessageHandler } from "utils/createTemporaryMessageHandler";

export const createSandboxedIframe = async (
  content: string,
  key: string,
  extraPermissions: ReadonlyArray<string> = [],
): Promise<HTMLIFrameElement> => {
  const { body } = document;
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  const permissions: ReadonlyArray<string> = [
    ...extraPermissions,
    "allow-scripts",
    "allow-same-origin",
  ];
  // Harden it
  frame.setAttribute("sandbox", permissions.join(" "));
  frame.setAttribute("name", key);
  // Now set it's content to the specified
  const { contentDocument } = body.insertBefore(frame, body.firstElementChild);
  if (contentDocument === null) throw new Error("frame not created correctly");
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
