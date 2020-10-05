const toTrainCase = (key: string): string => {
  return key.replace(
    /([A-Z])/g,
    (match: string): string => "-" + match.toLowerCase()
  );
};

export const cssToString = (style: any): string => {
  const keys: ReadonlyArray<[string, any]> = Object.entries(style);
  return keys.reduce((result: string, [key, value]: [string, any]): string => {
    return result + toTrainCase(key) + ":" + value + ";";
  }, "");
};
