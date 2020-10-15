import { Application } from "../types/application";
import { GoogleAccessToken } from "../types/googleAccessToken";
import {
  GoogleOAuthError,
  isGoogleOAuthError,
} from "../types/googleOAuthError";
import { extractAccessTokeFromUrl } from "./extractAccessTokeFromUrl";
import { toQueryString, toWindowOptions } from "./helpers";
import { setWindowCloseHandler } from "./setWindowCloseHandler";

export const startGoogleAuthentication = async (
  configuration: Application
): Promise<GoogleAccessToken> => {
  const queryString: string = toQueryString({
    client_id: configuration.clientID,
    response_type: "token",
    scope: "https://www.googleapis.com/auth/drive.appdata",
    // Redirect to the popup window because we can parse this
    // and extract the code to ask for the token
    redirect_uri: configuration.redirectURI,
  });
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`;
  const width = 530;
  const height = 639;
  // We don't use the response
  const popup: Window = window.open(
    oauthUrl,
    "google-oauth-window",
    toWindowOptions({
      menubar: "no",
      location: "no",
      chrome: "yes",
      dialog: "yes",
      resizeable: "no",
      status: "no",
      left: (screen.width - width) / 2,
      width: width,
      top: (screen.height - height) / 2,
      height: height,
    })
  );
  if (popup === null) {
    // FIXME: request permission from the user to show modals and go again
    return;
  }
  return new Promise(
    (
      resolve: (accessToken: GoogleAccessToken) => void,
      reject: (error?: GoogleOAuthError | Error) => void
    ): void => {
      const { redirectURI } = configuration;
      setWindowCloseHandler(popup, (location: Location | null): void => {
        if (location === null) {
          reject(
            new Error("cannot get the google access token from this window")
          );
        }
        const { href } = location;
        if (href === undefined) {
          return;
        }
        if (!href.startsWith(redirectURI)) {
          // Means the user closed the modal before being redirected
          // by google
          reject(new Error("user cancelled authentication"));
        } else {
          const result:
            | GoogleAccessToken
            | GoogleOAuthError = extractAccessTokeFromUrl(location);
          if (!isGoogleOAuthError(result)) {
            resolve(result);
          } else {
            reject(result);
          }
        }
      });
    }
  );
};
