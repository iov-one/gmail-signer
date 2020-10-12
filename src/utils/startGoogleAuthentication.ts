import redirectPage from "../templates/google-redirection-page.html";
import { Application } from "../types/application";
import { GoogleAccessToken } from "../types/googleAccessToken";
import {
  GoogleOAuthError,
  isGoogleOAuthError,
} from "../types/googleOAuthError";
import { extractAccessTokeFromUrl } from "./extractAccessTokeFromUrl";
import { toQueryString, toWindowOptions } from "./helpers";
import { sendMessage } from "./sendMessage";

export const createSignInWindowHandler = (redirectURI: string): void => {
  console.log("created dom content loaded listener");
  document.addEventListener("DOMContentLoaded", (): void => {
    const { pathname } = location;
    console.log(location);
    // This means that we are in the authentication window
    if (pathname === redirectURI) {
      window.onload = (): void => {
        const accessTokenOrError:
          | GoogleAccessToken
          | GoogleOAuthError = extractAccessTokeFromUrl(location);
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
};

export const startGoogleAuthentication = async (
  configuration: Application
): Promise<void> => {
  const queryString: string = toQueryString({
    client_id: configuration.clientID,
    response_type: "token",
    scope: "https://www.googleapis.com/auth/drive.appdata",
    // Redirect to the popup window because we can parse this
    // and extract the code to ask for the token
    redirect_uri: configuration.redirectURI,
  });
  const width = 530;
  const height = 639;
  // We don't use the response
  const popup: Window = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`,
    "",
    toWindowOptions({
      menubar: "no",
      location: "no",
      resizeable: "no",
      status: "no",
      left: (screen.width - width) / 2,
      width: width,
      top: (screen.height - height) / 2,
      height: height,
    })
  );
  if (popup === null) {
    return;
  }
  return new Promise((resolve: () => void, reject: () => void): void => {
    // Not an elegant method to do this, but apparently the only available
    // method
    const onCloseHandler = (): boolean => {
      if (!popup.closed) return false;
      const { redirectURI } = configuration;
      const { location } = popup;
      // If we are in the redirect URI then we are good, otherwise
      // womething went wrong
      if (redirectURI.includes(location.hostname)) {
        resolve();
      } else {
        reject();
      }
      return true;
    };
    const interval = setInterval((): void => {
      if (onCloseHandler()) {
        clearInterval(interval);
      }
    }, 350);
  });
};
