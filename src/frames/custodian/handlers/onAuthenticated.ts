import { Message } from "../../../types/message";
import { createMnemonic } from "../../signer/helpers/createMnemonic";
import { GDriveApi } from "../gDriveApi";
import NotFoundError = GDriveApi.NotFoundError;

export const onAuthenticated = async (): Promise<Message | null> => {
  try {
    const mnemonic: string = await GDriveApi.readMnemonic();
    return {
      target: "Signer",
      type: "Initialize",
      data: mnemonic,
    };
  } catch (error) {
    if (error.message === NotFoundError.message) {
      const mnemonic: string = await createMnemonic();
      // Save it too
      await GDriveApi.writeMnemonic(mnemonic);
      // Now we can return it
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
