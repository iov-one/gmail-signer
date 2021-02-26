import { propertyExistsAndHasType } from "utils/propertyExistsAndHasType";

export interface GoogleAccessToken {
  readonly token: string;
  readonly idToken: string;
  readonly expiresAt: number;
  readonly type: "Bearer";
  readonly scope: ReadonlyArray<string>;
}

export const isGoogleAccessToken = (
  value: GoogleAccessToken | unknown,
): value is GoogleAccessToken => {
  if (value === null || value === undefined) return false;
  const nonNullValue: GoogleAccessToken | any = value;
  if (!propertyExistsAndHasType(nonNullValue, "token", "string")) return false;
  if (!propertyExistsAndHasType(nonNullValue, "idToken", "string"))
    return false;
  if (!propertyExistsAndHasType(nonNullValue, "expiresAt", "number"))
    return false;
  if (typeof nonNullValue !== "object") return false;
  if (
    !(
      "type" in nonNullValue &&
      (nonNullValue as GoogleAccessToken).type === "Bearer"
    )
  )
    return false;
  return (
    "scope" in nonNullValue &&
    Array.isArray((nonNullValue as GoogleAccessToken).scope)
  );
};
