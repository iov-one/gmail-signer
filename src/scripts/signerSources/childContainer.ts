export class ChildContainer {
  private window: Window | null = null;

  public get childWindow(): Window | null {
    if (this.window !== null) return this.window;
    const iframe: HTMLIFrameElement = document.querySelector("iframe");
    if (iframe === null) {
      throw new Error(
        "invalid document, are you sure that you have the right setup?"
      );
    } else {
      this.window = iframe.contentWindow;
    }
    return this.window;
  }
}
