import { toQueryString, toWindowOptions } from "../utils/helpers";

// FIXME: this should come from config
const clientId =
  "114540268765-o75hj49afmk5s1lmaemp3tmirk3tsta8.apps.googleusercontent.com";

export const openGoogleAuthorizationPopup = (): void => {
  const queryString: string = toQueryString({
    client_id: clientId,
    response_type: "token",
    scope: "https://www.googleapis.com/auth/drive.appdata",
    // Redirect to the popup window because we can parse this
    // and extract the code to ask for the token
    redirect_uri: location.href,
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
