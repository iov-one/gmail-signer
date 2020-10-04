const keyValuePaster = (
  object: { [key: string]: string | number },
  glue: string
): string => {
  const entries: [string, string | number][] = Object.entries(object);
  return entries
    .map((pair: [string, string | number]): string =>
      pair.map(encodeURIComponent).join("=")
    )
    .join(glue);
};

export const toQueryString = (object: {
  [key: string]: string | number;
}): string => keyValuePaster(object, "&");

export const toWindowOptions = (object: {
  [key: string]: string | number;
}): string => keyValuePaster(object, ",");
