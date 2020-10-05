import modalContent from "../../../templates/show-mnemonic-modal.html";
import { CommonError } from "../../../types/commonError";
import { Message } from "../../../types/message";
import { Modal } from "../../modal";
import { Events } from "../../modal/events";
import { GDriveApi } from "../gDriveApi";

export const onSaveMnemonic = async (mnemonic: string): Promise<Message> => {
  const modal = new Modal();
  // Set content
  modal.setContent(modalContent, { mnemonic });
  modal.open();
  // Wait for the result and resolve or reject the promise
  return new Promise(
    (
      resolve: (message: Message) => void,
      reject: (error: CommonError) => void
    ) => {
      modal.on(Events.Accepted, async function (): Promise<void> {
        modal.off(Events.Accepted, this);
        modal.close();
        // This is a length operation, so please take your time
        await GDriveApi.writeMnemonic(mnemonic);
        // Resolve the promise as the user did accept the query
        resolve({
          target: "Signer",
          type: "Initialize",
          data: mnemonic,
        });
      });
      modal.on(Events.Rejected, function (): void {
        reject({
          message: "user rejected his new account",
        });
        modal.off(Events.Rejected, this);
        modal.close();
      });
    }
  );
};
