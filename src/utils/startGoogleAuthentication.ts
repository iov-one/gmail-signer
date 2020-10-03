import { GoogleConfiguration } from "../types/googleConfiguration";
import {
  GoogleOAuthError,
  isGoogleOAuthError,
} from "../types/googleOAuthError";
import { getAccessTokenFromRedirectUrl } from "./getAccessTokenFromRedirectUrl";
import { toQueryString, toWindowOptions } from "./helpers";
import { sendMessage } from "./sendMessage";
import redirectPage from "../templates/google-redirection-page.html";

const GOOGLE_REDIRECT_URI = "/gdrive-signer/on-auth-result";

const toValidUrl = (value: string, path: string): string => {
  if (path.startsWith("/")) {
    if (value.endsWith("/")) {
      return value + path.slice(1);
    } else {
      return value + path;
    }
  } else if (value.endsWith("/")) {
    return value + path;
  } else {
    return value + "/" + path;
  }
};

document.addEventListener("DOMContentLoaded", (): void => {
  const { pathname } = location;
  // This means that we are in the authentication window
  if (pathname === GOOGLE_REDIRECT_URI) {
    // Replace content of the document with a more approriate one, and
    // specially, prevent the scripts from running in this window
    document.open();
    document.write(redirectPage);
    document.close();
    window.onload = (): void => {
      const accessTokenOrError:
        | GoogleAccessToken
        | GoogleOAuthError = getAccessTokenFromRedirectUrl(location);
      if (!isGoogleOAuthError(accessTokenOrError)) {
        const { opener } = window;
        // Send back the result
        sendMessage(opener, {
          target: "Root",
          type: "Authenticated",
          data: accessTokenOrError,
        });
        // Close me
        window.removeEventListener("load", this);
        window.close();
      }
    };
  }
});

export const startGoogleAuthentication = (
  configuration: GoogleConfiguration
): void => {
  const queryString: string = toQueryString({
    client_id: configuration.clientID,
    response_type: "token",
    scope: "https://www.googleapis.com/auth/drive.appdata",
    // Redirect to the popup window because we can parse this
    // and extract the code to ask for the token
    redirect_uri: toValidUrl(location.href, GOOGLE_REDIRECT_URI),
  });
  const size = 530;
  // We don't use the response
  window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`,
    "",
    toWindowOptions({
      menubar: "no",
      location: "no",
      resizeable: "yes",
      status: "no",
      left: (screen.width - size) / 2,
      width: size,
      top: (screen.height - size) / 2,
      height: size,
    })
  );
};
