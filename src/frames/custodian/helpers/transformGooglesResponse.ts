import { GoogleAuthInfo } from "../../../types/googleAuthInfo";

export const transformGooglesResponse = (user: gapi.User): GoogleAuthInfo => {
  const auth = user.getAuthResponse(true);
  const profile = user.getBasicProfile();
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
      id: user.getId(),
      firstName: profile.getGivenName(),
      lastName: profile.getFamilyName(),
      email: profile.getEmail(),
      picture: profile.getImageUrl(),
    },
  };
};
