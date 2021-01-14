import { GoogleAccessToken } from "types/googleAccessToken";
import { GoogleUser } from "types/googleUser";

export interface GoogleAuthInfo {
  readonly accessToken: GoogleAccessToken;
  readonly user: GoogleUser;
}
