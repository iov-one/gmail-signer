export const sendAuthMessage = <T>(type: string, data?: T): void => {
  parent.postMessage(
    {
      type: type,
      data: data,
    },
    location.origin,
  );
};
