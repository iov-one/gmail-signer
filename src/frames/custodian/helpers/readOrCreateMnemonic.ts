import { GDriveApi } from "frames/custodian/gDriveApi";
import { createMnemonic } from "frames/signer/helpers/createMnemonic";
import { GoogleAccessToken } from "types/googleAccessToken";

export const readOrCreateMnemonic = async (
  accessToken: GoogleAccessToken,
): Promise<string> => {
  try {
    return await GDriveApi.readMnemonic(accessToken);
  } catch (error) {
    if (error === GDriveApi.NotFoundError) {
      const mnemonic: string = await createMnemonic();
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
