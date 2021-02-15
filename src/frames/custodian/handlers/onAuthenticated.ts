import { GDriveApi } from "frames/custodian/gDriveApi";
import { createMnemonic } from "frames/signer/helpers/createMnemonic";
import { Message } from "types/message";
import { SignerActions } from "types/signerActions";
import NotFoundError = GDriveApi.NotFoundError;

export const onAuthenticated = async (): Promise<Message<
  SignerActions,
  string
> | null> => {
  try {
    const mnemonic: string = await GDriveApi.readMnemonic();
    return {
      target: "Signer",
      type: SignerActions.Initialize,
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
        type: SignerActions.Initialize,
        data: mnemonic,
      };
    } else {
      // Since this is not an special error, please rethrow it
      throw error;
    }
  }
};
