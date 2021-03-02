export const sendAuthMessage = <T>(type: string, data?: T): void => {
  parent.postMessage(
    {
      type,
      data,
    },
    location.origin,
  );
};
