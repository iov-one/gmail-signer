import { GoogleAccessToken } from "../../../types/googleAccessToken";
import { createMnemonic } from "../../signer/helpers/createMnemonic";
import { GDriveApi } from "../gDriveApi";

export const readOrCreateMnemonic = async (
  mnemonicLength: 12 | 24,
  accessToken: GoogleAccessToken,
): Promise<string> => {
  try {
    return await GDriveApi.readMnemonic(accessToken);
  } catch (error) {
    if (error === GDriveApi.NotFoundError) {
      const mnemonic: string = await createMnemonic(mnemonicLength);
      // Save it too
      await GDriveApi.writeMnemonic(accessToken, mnemonic);
      // Now we can return it
      return mnemonic;
    } else {
      // Since this is not an special error, please rethrow it
      throw error;
    }
  }
};
