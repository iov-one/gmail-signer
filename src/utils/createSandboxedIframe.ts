import { Application } from "types/application";

import { SignerConfig } from "../signer";
interface Config {
  readonly signer: SignerConfig;
  readonly application: Application;
}

export const createSandboxedIframe = async (
  content: string,
  config: Config,
  key: string,
  parent = document.body,
  permissions = ["allow-scripts", "allow-popups"],
): Promise<HTMLIFrameElement> => {
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null so this is important to be done before anything else
  parent.insertBefore(frame, parent.firstElementChild);
  // Now set it's content to the specified
  const { contentWindow, contentDocument } = frame;
  // Set global data
  contentWindow.signerConfig = config.signer;
  contentWindow.application = config.application;
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  return new Promise((resolve: (frame: HTMLIFrameElement) => void): void => {
    const loaded = (event: MessageEvent): void => {
      if (event.source !== contentWindow || event.origin !== location.origin) return;
      // Remove the listener to keep it clean
      contentWindow.removeEventListener("message", loaded);
      /**
       * The very first message is empty. It just notifies us
       * that the window has loaded and we immediately remove the
       * message listener
       */
      const { body } = contentDocument;
      // Swallow mouse move events
      const ignore = (event: MouseEvent): void => {
        event.stopPropagation();
        event.preventDefault();
      };
      body.onmouseover = ignore;
      body.onmouseenter = ignore;
      body.onmousemove = ignore;
      // Now sandbox it
      frame.setAttribute("sandbox", permissions.join(" "));
      frame.setAttribute("id", "gdrive-custodian-" + key);
      // Now we can export
      resolve(frame);
    };
    contentWindow.addEventListener("message", loaded);
  });
};
