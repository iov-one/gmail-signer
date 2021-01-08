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
  } catch (error: any) {
    if (error.message === NotFoundError.message) {
      return {
        target: "Signer",
        type: "Initialize",
        data: await createMnemonic(),
      };
    } else {
      // Since this is not an special error, please rethrow it
      throw error;
    }
  }
};
