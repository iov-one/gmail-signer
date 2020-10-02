export const getAccessTokenFromRedirectUrl = (
  location: Location
): GoogleAccessToken | boolean => {
  const { hash } = location;
  if (hash === "") return false;
  const queryString: string = hash.slice(1);
  const result = queryString
    .split("&")
    .map((pair: string): [string, string] => {
      const items: string[] = pair.split("=");
      if (items.length !== 2) throw new Error("cannot parse as query string");
      return [items[0], items[1]];
    })
    .reduce(
      (
        object: { [key: string]: string },
        [name, value]: [string, string]
      ): { [key: string]: string } => {
        return { ...object, [name]: value };
      },
      {}
    );
  if ("token_type" in result && result.token_type === "Bearer") {
    const { scope } = result;
    return {
      expiresIn: Number(result.expires_in),
      scope: scope.split(","),
      state: result.state,
      token: result.access_token,
      type: "Bearer",
    };
  }
};
