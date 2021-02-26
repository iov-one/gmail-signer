const isTrustedSource = (event: MessageEvent): boolean => {
  if (event.source === parent) return true;
  for (let i = 0; i < frames.length; ++i) {
    if (frames[i] === event.source) {
      return true;
    }
  }
  return false;
};

const isTrustedOrigin = (event: MessageEvent): boolean => {
  return event.origin === location.origin;
};

const isWindow = (value: any | Window): value is Window => {
  return "postMessage" in value;
};

export const createTemporaryMessageHandler = <T>(
  handler: (source: Window, data?: T) => Promise<boolean> | boolean,
): void => {
  const asyncHandler = async (event: MessageEvent): Promise<void> => {
    console.log(event);
    if (!isWindow(event.source))
      throw new Error(
        "message sent by a source that is not a window, forbidden",
      );
    // Ensure we trust it
    if (!isTrustedSource(event) || !isTrustedOrigin(event)) {
      // Ignore this untrusted message
      return;
    }
    // Run the handler
    if (await handler(event.source, event.data)) {
      // Remove the listener now that we've handled it
      window.removeEventListener("message", syncHandler, true);
    }
  };
  const syncHandler = (event: MessageEvent): void => {
    void asyncHandler(event);
  };
  window.addEventListener("message", syncHandler, true);
};
