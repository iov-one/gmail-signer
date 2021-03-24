import { propertyExistsAndHasType } from "utils/propertyExistsAndHasType";

export interface GoogleUser {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly picture: string;
}

export const isGoogleUser = (
  value: Record<string, unknown> | GoogleUser,
): value is GoogleUser => {
  if (!propertyExistsAndHasType(value, "firstName", "string")) return false;
  if (!propertyExistsAndHasType(value, "lastName", "string")) return false;
  if (!propertyExistsAndHasType(value, "email", "string")) return false;
  return propertyExistsAndHasType(value, "picture", "string");
};
