const getOptimalSize = (element: HTMLElement): number[] => {
  const { style } = element;
  const saved = [style.width, style.height];
  style.width = "1px";
  style.height = "1px";
  // Collect the size
  const size = [element.scrollWidth, element.scrollHeight];
  // Reset the styles
  style.width = saved[0];
  style.height = saved[1];
  // Return the result
  return size;
};

const resizeAndCenter = (
  window: Window,
  width: number,
  height: number
): void => {
  const centerX: number = (screen.width - width) / 2;
  const centerY: number = (screen.height - height) / 2;
  window.moveTo(centerX, centerY);
  window.resizeTo(width, height);
};

export const resizeToFit = (window: Window): void => {
  const { document } = window;
  const root: HTMLElement | null = document.querySelector("#root, div");
  if (root !== null) {
    const [width, height] = getOptimalSize(root);
    window.onresize = (): void => {
      window.onresize = null;
      // Ok, so now the content size is smaller by some amount, so we need
      // to use it and compute the actually optimal outer size
      const finalWidth = 2 * width - window.innerWidth;
      const finalHeight = 2 * height - window.innerHeight;
      // Finally apply the new and definitive size
      resizeAndCenter(window, finalWidth, finalHeight);
    };
    // Now apply these to the window
    resizeAndCenter(window, width, height);
  }
};
