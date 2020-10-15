import { CommonError } from "../../../types/commonError";
import { ModalEvents } from "../../../types/modalEvents";
import { Modal } from "../../modal";
import { GDriveApi } from "../gDriveApi";

export const showSaveModal = async (mnemonic: string): Promise<void> => {
  const {
    mnemonic: { path, elementId },
  } = window.signerConfig;
  const modal = new Modal();
  // Wait for the result and resolve or reject the promise
  return new Promise(
    (resolve: () => void, reject: (error: CommonError) => void) => {
      // On loaded event handler, this will set the mnemonic
      // in the user provided window content
      modal.on(ModalEvents.Loaded, (document: HTMLDocument): void => {
        const element: HTMLElement | null = document.getElementById(elementId);
        if (element !== null) {
          const words: ReadonlyArray<string> = mnemonic.split(/[ \t\n]+/);
          words.forEach((word: string): void => {
            const span: HTMLSpanElement = document.createElement("span");
            const text: Node = document.createTextNode(word);
            // Add the text to the span element
            span.appendChild(text);
            // Add the span element to the container
            element.appendChild(span);
          });
        }
      });
      // On accepted event handler
      modal.on(ModalEvents.Accepted, async function (): Promise<void> {
        modal.close();
        // This is a length operation, so please take your time
        await GDriveApi.writeMnemonic(mnemonic);
        // Resolve the promise as the user did accept the query
        resolve();
      });
      // On rejected event handler
      modal.on(ModalEvents.Rejected, function (): void {
        modal.close();
        reject({
          message: "user rejected his new account",
        });
      });
      // Please open the modal window :)
      modal.open(path, "custodian::create-mnemonic", 600, 400);
    }
  );
};
