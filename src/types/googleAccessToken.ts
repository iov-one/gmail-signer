import { propertyExistsAndHasType } from "utils/propertyExistsAndHasType";

export interface GoogleAccessToken {
  readonly token: string;
  readonly idToken: string;
  readonly expiresAt: number;
  readonly type: "Bearer";
  readonly scope: ReadonlyArray<string>;
}

export const isGoogleAccessToken = (
  value: Record<string, unknown> | GoogleAccessToken,
): value is GoogleAccessToken => {
  if (!propertyExistsAndHasType(value, "token", "string")) return false;
  if (!propertyExistsAndHasType(value, "idToken", "string")) return false;
  if (!propertyExistsAndHasType(value, "expiresAt", "number")) return false;
  if (!("type" in value && value.type === "Bearer")) return false;
  return "scope" in value && Array.isArray(value.scope);
};
