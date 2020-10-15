import { ModalEvents } from "../../types/modalEvents";
import { toWindowOptions } from "../../utils/helpers";
import { resizeToFit } from "../../utils/resizeToFit";
import { setWindowCloseHandler } from "../../utils/setWindowCloseHandler";

type GenericCallback = (...args: any[]) => void;

export class Modal {
  private popup: Window | null;

  private handlers: { [event in ModalEvents]: GenericCallback | undefined } = {
    [ModalEvents.Rejected]: undefined,
    [ModalEvents.Loaded]: undefined,
    [ModalEvents.Accepted]: undefined,
  };

  private invokeHandler(event: ModalEvents, ...args: any[]): void {
    const handler: GenericCallback | undefined = this.handlers[event];
    if (handler !== undefined) {
      handler(...args);
    }
  }

  private loadHandler = (): void => {
    const { popup } = this;
    const { document } = popup;
    // Install button handlers
    const accept: HTMLElement | null = document.querySelector(
      "[data-button='accept']"
    );
    const reject: HTMLElement | null = document.querySelector(
      "[data-button='reject']"
    );
    if (accept === null || reject === null) {
      throw new Error(
        "content is expected to have 2 buttons one with the `data-button' attribute set to" +
          ' "accept" and the other to "reject"'
      );
    }
    accept.onclick = (): void => this.invokeHandler(ModalEvents.Accepted);
    reject.onclick = (): void => this.invokeHandler(ModalEvents.Rejected);
    // In case the caller wants to do something, let's allow them
    this.invokeHandler(ModalEvents.Loaded, document);
    // Wait until the popup is fully "loaded" with
    // the new items created in it!
    popup.setTimeout((): void => {
      // Now resize it as to fit it's contents
      resizeToFit(popup);
    }, 0);
  };

  public open(path: string, name = "", width = 1, height = 1): void {
    const popup: Window = window.open(
      path,
      name,
      toWindowOptions({
        menubar: "no",
        location: "no",
        chrome: "yes",
        dialog: "yes",
        resizeable: "no",
        status: "no",
        left: (screen.width - width) / 2,
        width: width,
        top: (screen.height - height) / 2,
        height: height,
      })
    );
    if (popup === null) {
      console.warn("this is crazy man!");
      // FIXME: request permission from the user to show modals and go again
      return;
    }
    this.popup = popup;
    // For the load event, we want to setup a few things
    popup.addEventListener("load", this.loadHandler);
    // Watch the window to catch if the user closes it
    setWindowCloseHandler(popup, (): void => {
      // This is the same as "reject"
      this.invokeHandler(ModalEvents.Rejected);
      // Now call the "close" method
      this.close();
    });
  }

  public close(): void {
    const { popup } = this;
    // Close the window if it's not already closed
    if (popup !== null && popup.closed === false) {
      popup.removeEventListener("load", this.loadHandler);
      popup.close();
    }
    // Release memory
    this.popup = null;
    // Just keep it clean ;)
    this.handlers = {
      [ModalEvents.Rejected]: undefined,
      [ModalEvents.Loaded]: undefined,
      [ModalEvents.Accepted]: undefined,
    };
  }

  public on(event: ModalEvents, handler: (...args: any[]) => void) {
    this.handlers[event] = handler;
  }
}
