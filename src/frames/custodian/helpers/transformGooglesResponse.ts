import { gapi } from "gapi";
import { GoogleAuthInfo } from "types/gogoleAuthInfo";

export const transformGooglesResponse = (user: gapi.User): GoogleAuthInfo => {
  const profile: gapi.BasicProfile = user.getBasicProfile();
  const auth = user.getAuthResponse(true);
  const { scope } = auth;
  return {
    accessToken: {
      token: auth.access_token,
      expiresAt: Number(auth.expires_at),
      idToken: auth.id_token,
      type: "Bearer",
      scope: scope.split(" "),
    },
    user: {
      firstName: profile.getGivenName(),
      lastName: profile.getFamilyName(),
      email: profile.getEmail(),
      picture: profile.getImageUrl(),
    },
  };
};
