import { FRAME_CREATED_AND_LOADED } from "frames/constants";
import { SignerConfig } from "signer";
import { Application } from "types/application";

interface Config {
  readonly signer: SignerConfig;
  readonly application: Application;
}

export const createSandboxedIframe = async (
  content: string,
  config: Config,
  key: string,
  parent = document.body,
): Promise<HTMLIFrameElement> => {
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null so this is important to be done before anything else
  parent.insertBefore(frame, parent.firstElementChild);
  // Now set it's content to the specified
  const { contentWindow, contentDocument } = frame;
  // Set global data
  //
  // It is important to do this before sandboxing
  // the iframe, or it will not allow us to do it
  contentWindow.signerConfig = config.signer;
  contentWindow.application = config.application;
  // Harden and identify. Must be hardened here because other wise,
  // we cannot write the config
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("id", "gdrive-custodian-" + key);
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  return new Promise(
    (
      resolve: (frame: HTMLIFrameElement) => void,
      reject: (reason: Error) => void,
    ): void => {
      const loaded = (): void => {
        try {
          // Remove the listener to keep it clean
          contentWindow.removeEventListener(
            FRAME_CREATED_AND_LOADED,
            loaded,
            true,
          );
          // Now we can export
          resolve(frame);
        } catch (error) {
          reject(error);
        }
      };
      contentWindow.addEventListener(FRAME_CREATED_AND_LOADED, loaded, true);
    },
  );
};
