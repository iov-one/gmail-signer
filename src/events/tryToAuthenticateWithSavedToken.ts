import { GOOGLE_ACCESS_TOKEN_STORAGE_PATH } from "../constants";
import { GoogleAccessToken } from "../types/googleAccessToken";
import { onAccessTokenReceived } from "./onAccessTokenReceived";

const isAccessTokenValid = async (
  accessToken: GoogleAccessToken
): Promise<boolean> => {
  return true;
};

export const tryToAuthenticateWithSavedToken = async (
  signerWindow: Window
): Promise<boolean> => {
  await new Promise((resolve: () => void): void => {
    setTimeout(resolve, 3000);
  });
  // Attempt to see if we already have a token to query the GDrive
  // api with
  const savedToken: string | null = localStorage.getItem(
    GOOGLE_ACCESS_TOKEN_STORAGE_PATH
  );
  // Check if we already own an access token
  if (savedToken !== null) {
    // FIXME: ideally we should request disabling the button
    //        waiting for this
    // If we do have it, just initialize the rest
    // without prompting the user
    try {
      const accessToken: GoogleAccessToken = JSON.parse(savedToken);
      // We also must confirm that it is not expired
      if (
        accessToken.expiresAt < Date.now() &&
        (await isAccessTokenValid(accessToken))
      ) {
        // Token has expired
        localStorage.removeItem(GOOGLE_ACCESS_TOKEN_STORAGE_PATH);
      } else {
        // Use saved token
        onAccessTokenReceived(signerWindow, accessToken);
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
};
