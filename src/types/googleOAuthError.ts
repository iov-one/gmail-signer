export interface GoogleOAuthError {
  readonly reason: string;
}

export const isGoogleOAuthError = (value: any): value is GoogleOAuthError => {
  return (
    typeof value === "object" &&
    "reason" in value &&
    typeof value.reason === "string"
  );
};
