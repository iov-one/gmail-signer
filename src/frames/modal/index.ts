import { cssToString } from "../../utils/css";
import { sendMessage } from "../../utils/sendMessage";
import { compileTemplate } from "./compileTemplate";
import { createButton } from "./createButton";
import { Events } from "./events";
import {
  ButtonBoxStyle,
  ModalContainerStyle,
  ModalContentStyle,
} from "./styles";

export class Modal {
  private readonly element: HTMLElement;

  public constructor() {
    this.element = document.createElement("div");
  }

  public open(): void {
    const { body } = document;
    body.appendChild(this.element);
    // Modals inside iframes need the iframe itself to be visible
    // inside the parent window, for which we send this message and
    // hope the parent window does allow the modal to show
    sendMessage(parent, {
      target: "Root",
      type: "ShowModal",
    });
  }

  public close(): void {
    const { body } = document;
    // Now we must tell the parent window that we no longer want to show
    // the modal
    sendMessage(parent, {
      target: "Root",
      type: "ModalDismissed",
    });
    body.removeChild(this.element);
  }

  public setContent(html: string, data?: any): void {
    const container: HTMLElement = this.element;
    // Style it
    container.setAttribute("style", cssToString(ModalContainerStyle));
    const content: HTMLElement = document.createElement("div");
    // Write to it the html
    content.innerHTML = compileTemplate(html, data);
    content.setAttribute("style", cssToString(ModalContentStyle));
    // Create buttons
    const accept: HTMLInputElement = createButton(
      "Accept",
      (): void => {
        container.dispatchEvent(new CustomEvent("accepted"));
      },
      true
    );
    const reject: HTMLInputElement = createButton("Reject", (): void => {
      container.dispatchEvent(new CustomEvent("rejected"));
    });
    const box: HTMLDivElement = document.createElement("div");
    // Insert buttons in the box
    box.setAttribute("style", cssToString(ButtonBoxStyle));
    box.appendChild(accept);
    box.appendChild(reject);
    // Insert the box in the content
    content.appendChild(box);
    // Append it to the container
    container.appendChild(content);
  }

  public on(event: Events, handler: () => void) {
    const { element } = this;
    element.addEventListener(event, handler, true);
  }

  public off(event: Events, handler: () => void) {
    const { element } = this;
    element.removeEventListener(event, handler, true);
  }
}
