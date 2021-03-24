export const propertyExistsAndHasType = <T>(
  value: T | any,
  key: keyof T,
  type: string,
): boolean => {
  const typedValue = value as T;
  // Check if the property exists and it's type matches
  return key in value && typeof typedValue[key] === type;
};
