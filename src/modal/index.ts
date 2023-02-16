import { ModalEvents } from "../types/modalEvents";
import { toWindowOptions } from "../utils/helpers";
import { setWindowCloseHandler } from "../utils/setWindowCloseHandler";

type GenericCallback = (...args: any[]) => void;

export class Modal {
  private popup: Window | null = null;
  private settled = false;

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

  private accept(): void {
    this.settled = true;
    this.invokeHandler(ModalEvents.Accepted);
  }

  private reject(): void {
    this.settled = true;
    this.invokeHandler(ModalEvents.Rejected);
  }

  private onLoad = (): void => {
    const { popup } = this;
    if (popup === null)
      throw new Error("window was never created, something is wrong");
    const { document } = popup;
    document.addEventListener("keydown", (event: KeyboardEvent): void => {
      if (event.ctrlKey) {
        if (event.key === "W" || event.key === "w") {
          return;
        } else {
          event.preventDefault();
        }
      }
      // In principle, other targets should allow keyboard
      // events
      if (event.target === document.body) {
        event.preventDefault();
      }
    });
    // Install button handlers
    const accepts: NodeListOf<HTMLElement> = document.querySelectorAll(
      "[data-button='accept']",
    );
    const rejects: NodeListOf<HTMLElement> = document.querySelectorAll(
      "[data-button='reject']",
    );
    accepts.forEach((accept: HTMLElement): void => {
      accept.onclick = (): void => this.accept();
    });
    // We allow multiple reject buttons
    rejects.forEach((reject: HTMLElement): void => {
      reject.onclick = (): void => this.reject();
    });
    // In case the caller wants to do something, let's allow them
    // Wait until the popup is fully "loaded" with
    // the new items created in it!
    // FIXME: find a way to check if react page is done loading
    // and includes butto elements in it
    popup.setTimeout((): void => {
      this.invokeHandler(ModalEvents.Loaded, document);
      // FIXME: we should put this back at some point
      // Now resize it as to fit it's contents
      // resizeToFit(popup);
    }, 1500);
  };

  public open(path: string, name = "", width = 1, height = 1): void {
    const popup: Window | null = window.open(
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
      }),
    );
    if (popup === null) {
      console.warn("this is crazy man!");
      // FIXME: request permission from the user to show modals and go again
      return;
    }
    this.popup = popup;
    // For the load event, we want to setup a few things
    this.popup.addEventListener("load", this.onLoad);
    // Watch the window to catch if the user closes it. It runs on both,
    // user clicking the x of the window and closing it and programmatically
    // calling .close()
    //
    // For this reason, we need the ability to know if it was an spontaneous
    // action from the user or of the user clicked one of the control buttons
    // that could trigger a programmatic call to .close()
    setWindowCloseHandler(popup, (): void => {
      // If the popup was settled it means we don't need to emit a
      // spontaneous reject event
      if (!this.settled) {
        // This is the same as "reject"
        this.invokeHandler(ModalEvents.Rejected);
      }
      // Now call the "close" method
      this.close();
    });
  }

  public close(): void {
    const { popup } = this;
    // Close the window if it's not already closed
    if (popup !== null && !popup.closed) {
      popup.removeEventListener("load", this.onLoad);
      popup.close();
    }
    // Release memory
    this.popup = null;
  }

  public on(event: ModalEvents, handler: (...args: any[]) => void): void {
    this.handlers[event] = handler;
  }
}
