export const isError = (value: any | Error): value is Error => {
  return value instanceof Error;
};
