import { SignerConfig } from "../signer";

const FlatFrameStyle = `
body, html {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: none;
}

body iframe {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: none;
}

body button {
  position: fixed;
  top: 0;
  height: 100%;
  left: 0;
  width: 100%;
  border: none;
  background: none;
  outline: none;
}
`;

export const createSandboxedIframe = (
  content: string,
  config: SignerConfig,
  key: string,
  parent = document.body,
  permissions = ["allow-scripts", "allow-popups"],
): HTMLIFrameElement => {
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null so this is important to be done before anything else
  parent.insertBefore(frame, parent.firstElementChild);
  // Now set it's content to the specified
  const { contentWindow, contentDocument } = frame;
  // Set global data
  contentWindow.signerConfig = config;
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  const { head, body } = contentDocument;
  const style = contentDocument.createElement("style");
  const css = contentDocument.createTextNode(FlatFrameStyle);
  // Swallow mouse move events
  const ignore = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
  };
  body.onmouseover = ignore;
  body.onmouseenter = ignore;
  body.onmousemove = ignore;
  style.appendChild(css);
  // Now sandbox it
  head.appendChild(style);
  // Finally sandbox it
  frame.setAttribute("sandbox", permissions.join(" "));
  frame.setAttribute("data-key", key);
  // Now we can export
  return frame;
};
