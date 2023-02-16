import { FRAME_CREATED_AND_LOADED } from "../frames/constants";
import { createTemporaryMessageListener } from "../utils/createTemporaryMessageListener";

export const sandboxFrame = async (
  content: string,
  key: string,
  extraPermissions: ReadonlyArray<string> = [],
): Promise<HTMLIFrameElement> => {
  const { body } = document;
  // Create the iframe
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // Append the iframe to the body object
  body.appendChild(frame);
  const permissions: ReadonlyArray<string> = [
    ...extraPermissions,
    "allow-scripts",
    "allow-same-origin",
  ];
  // Harden it
  frame.setAttribute("sandbox", permissions.join(" "));
  frame.setAttribute("name", key);
  const contentDocument: Document = frame.contentDocument as Document;
  // Write the html
  contentDocument.open();
  // NOTE: This is the only way because `content' is to long to put it
  //       in a data uri.
  //
  //       According to this article
  //
  //         https://developers.google.com/web/updates/2016/08/removing-document-write
  //
  //       which apparently suggests that we cannot use this, if the script
  //       is loaded inside an iframe it is ok
  contentDocument.write(content);
  contentDocument.close();
  // FIXME: is there a case in which we could reject this promise?
  return new Promise((resolve: (frame: HTMLIFrameElement) => void): void => {
    createTemporaryMessageListener(
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
