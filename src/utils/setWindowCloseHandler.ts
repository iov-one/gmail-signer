export const setWindowCloseHandler = (
  targetWindow: Window,
  handler: (location: Location | null) => void
): void => {
  let lastLocation: Location | null = null;
  // Not an elegant method to do this, but apparently the only available
  // method
  const checkWindowCloseState = (): boolean => {
    if (!targetWindow.closed) {
      try {
        // Only possible for same origin.
        //
        // Yes, it looks like this is a very hacky way. But honestly
        // the whole thing is a hacky trick.
        lastLocation = { ...targetWindow.location };
      } catch {
        // Do nothing really
      }
      return false;
    }
    // This means it's closed so let's call the handler
    handler(lastLocation);
    // Stop the interval now
    return true;
  };
  checkWindowCloseState();
  // Now do it regularly
  const interval = setInterval((): void => {
    if (checkWindowCloseState()) {
      clearInterval(interval);
    }
  }, 350);
};
