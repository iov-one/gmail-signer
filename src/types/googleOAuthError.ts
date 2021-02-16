export interface GoogleOAuthError {
  readonly reason: string;
}

export const isGoogleOAuthError = (
  value: any | GoogleOAuthError,
): value is GoogleOAuthError => {
  return (
    typeof value === "object" &&
    "reason" in value &&
    typeof (value as GoogleOAuthError).reason === "string"
  );
};
