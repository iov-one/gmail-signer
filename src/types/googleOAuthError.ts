import { gapi } from "../gapi";

export interface GoogleOAuthError {
  readonly reason: string;
}

export const isGoogleOAuthError = (
  value: any | GoogleOAuthError,
): value is GoogleOAuthError => {
  return typeof value === "object" && "reason" in value;
};

export const isGoogleAuthError = (
  value: any | gapi.Error,
): value is gapi.Error => {
  const valueAsError = value as gapi.Error;
  return "error" in value && valueAsError.error !== undefined;
};
