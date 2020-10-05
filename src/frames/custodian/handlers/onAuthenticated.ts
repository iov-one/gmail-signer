import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onAuthenticated = async (): Promise<Message | null> => {
  try {
    const mnemonic: string = await GDriveApi.readMnemonic();
    return {
      target: "Signer",
      type: "Initialize",
      data: mnemonic,
    };
  } catch (error: any) {
    return {
      target: "Root",
      type: "RequestMnemonicCreation",
      data: error,
    };
  }
};
