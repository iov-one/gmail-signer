import { Message } from "../../../types/message";
import { createMnemonic } from "../../signer/helpers/createMnemonic";
import { GDriveApi } from "../gDriveApi";
import { showSaveModal } from "../helpers/showSaveModal";
import NotFoundError = GDriveApi.NotFoundError;

export const onAuthenticated = async (): Promise<Message | null> => {
  try {
    const mnemonic: string = await GDriveApi.readMnemonic();
    return {
      target: "Signer",
      type: "Initialize",
      data: mnemonic,
    };
  } catch (error: any) {
    if (error.message === NotFoundError.message) {
      const mnemonic: string = await createMnemonic();
      // If this throws we are not catching the error so it
      // will be propagated to the caller
      await showSaveModal(mnemonic);
      // If nothing was thrown, then good
      return {
        target: "Signer",
        type: "Initialize",
        data: mnemonic,
      };
    } else {
      // Since this is not an special error, please rethrow it
      throw error;
    }
  }
};
