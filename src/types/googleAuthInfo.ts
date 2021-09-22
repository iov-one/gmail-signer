import {
  GoogleAccessToken,
  isGoogleAccessToken,
} from "../types/googleAccessToken";
import { GoogleUser, isGoogleUser } from "../types/googleUser";

export interface GoogleAuthInfo {
  readonly accessToken: GoogleAccessToken;
  readonly user: GoogleUser;
}

export const isGoogleAuthInfo = (
  value: any | GoogleAuthInfo,
): value is GoogleAuthInfo => {
  if (!("accessToken" in value)) return false;
  if (!("user" in value)) return false;
  const authInfo = value as GoogleAuthInfo;
  if (!isGoogleAccessToken(authInfo.accessToken)) return false;
  return isGoogleUser(authInfo.user);
};
