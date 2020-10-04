import { GoogleAccessToken } from "../../../types/googleAccessToken";
import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onAuthenticated = async (
  accessToken: GoogleAccessToken
): Promise<Message | null> => {
  try {
    const mnemonic: string = await GDriveApi.readMnemonic(accessToken);
    return {
      target: "Signer",
      type: "Initialize",
      data: mnemonic,
    };
  } catch (error: any) {
    if (error === GDriveApi.NotFoundError) {
      return {
        target: "Root",
        type: "RequestMnemonicCreation",
        data: error,
      };
    } else {
      return {
        target: "Root",
        type: "Error",
        data: error,
      };
    }
  }
};
