import { GOOGLE_ACCESS_TOKEN_STORAGE_PATH } from "../constants";
import { GoogleAccessToken } from "../types/googleAccessToken";

interface TokenInfo {
  readonly access_type: string;
  readonly aud: string;
  readonly azp: string;
  readonly exp: string;
  readonly expires_in: string;
  readonly scope: string;
}

const isAccessTokenValid = async (
  accessToken: GoogleAccessToken,
): Promise<boolean> => {
  if (accessToken.expiresAt < Date.now()) {
    return false;
  }
  const url: string =
    "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" +
    accessToken.token;
  try {
    const response: Response = await fetch(url);
    return response.status === 200;
  } catch {
    return false;
  }
};

export const tryToAuthenticateWithSavedToken = async (): Promise<GoogleAccessToken | null> => {
  await new Promise((resolve: (value: unknown) => void): void => {
    setTimeout(resolve, 3000);
  });
  // Attempt to see if we already have a token to query the GDrive
  // api with
  const savedToken: string | null = localStorage.getItem(
    GOOGLE_ACCESS_TOKEN_STORAGE_PATH,
  );
  // Check if we already own an access token
  if (savedToken !== null) {
    // FIXME: ideally we should request disabling the button
    //        waiting for this
    // If we do have it, just initialize the rest
    // without prompting the user
    try {
      const accessToken: GoogleAccessToken = JSON.parse(savedToken);
      const isValid = await isAccessTokenValid(accessToken);
      // We also must confirm that it is not expired
      if (!isValid) {
        // Token has expired
        localStorage.removeItem(GOOGLE_ACCESS_TOKEN_STORAGE_PATH);
      } else {
        return accessToken;
      }
    } catch {
      return null;
    }
  }
  return null;
};
