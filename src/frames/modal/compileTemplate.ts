export const compileTemplate = (html: string, data?: any): string => {
  if (data === undefined) {
    return html;
  } else {
    const keys: ReadonlyArray<[string, any]> = Object.entries(data);
    return keys.reduce(
      (result: string, [key, value]: [string, any]): string => {
        return html.replace(`%{${key}}`, value);
      },
      html
    );
  }
};
