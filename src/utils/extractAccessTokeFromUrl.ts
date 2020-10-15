import { GoogleAccessToken } from "../types/googleAccessToken";
import { GoogleOAuthError } from "../types/googleOAuthError";

export const InvalidUrlError: GoogleOAuthError = {
  reason: "Invalid URL provided to parse the token information",
};

export const extractAccessTokeFromUrl = (
  location: Location
): GoogleAccessToken | GoogleOAuthError => {
  const { hash } = location;
  if (hash === "") {
    return InvalidUrlError;
  }
  const queryString: string = hash.slice(1);
  const result = queryString
    .split("&")
    .map((pair: string): [string, string] => {
      const items: string[] = pair.split("=");
      if (items.length !== 2) throw new Error("cannot parse as query string");
      return [items[0], items[1]];
    })
    .reduce(
      (
        object: { [key: string]: string },
        [name, value]: [string, string]
      ): { [key: string]: string } => {
        return { ...object, [name]: value };
      },
      {}
    );
  if ("error" in result) {
    return {
      reason: result.error,
    };
  } else if ("token_type" in result && result.token_type === "Bearer") {
    const { scope } = result;
    return {
      expiresAt: 1000 * Number(result.expires_in) + Date.now(),
      scope: scope.split(","),
      state: result.state,
      token: result.access_token,
      type: "Bearer",
    };
  } else {
    throw new Error(
      "redirected to the correct URL but cannot extract from it the needed data"
    );
  }
};
