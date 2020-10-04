import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onSaveMnemonic = async (mnemonic: string): Promise<Message> => {
  await GDriveApi.writeMnemonic(mnemonic);
  return {
    target: "Signer",
    type: "Initialize",
    data: mnemonic,
  };
};
