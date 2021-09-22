import { VoidCallback } from "../types/voidCallback";

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
  if (value === null) return false;
  return "postMessage" in value;
};

export const createTemporaryMessageListener = <T>(
  handler: (source: Window, data?: T) => Promise<boolean> | boolean,
  originSpecificHandlers: { [origin: string]: (data: any) => boolean } = {},
): VoidCallback => {
  const asyncHandler = async (event: MessageEvent): Promise<void> => {
    const originSpecificHandler: ((data: any) => boolean) | undefined =
      originSpecificHandlers[event.origin];
    if (originSpecificHandler !== undefined) {
      if (originSpecificHandler(event.data)) {
        window.removeEventListener("message", syncHandler);
        return;
      }
    }
    if (!isWindow(event.source)) {
      return;
    }
    // Ensure we trust it
    if (!isTrustedSource(event) || !isTrustedOrigin(event)) {
      // Ignore this untrusted message
      return;
    }
    // Run the handler
    if (await handler(event.source, event.data)) {
      // Remove the listener now that we've handled it
      window.removeEventListener("message", syncHandler);
    }
  };
  const syncHandler = (event: MessageEvent): void => {
    void asyncHandler(event);
  };
  window.addEventListener("message", syncHandler);
  return (): void => {
    window.removeEventListener("message", syncHandler);
  };
};
