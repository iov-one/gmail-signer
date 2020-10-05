import { cssToString } from "./css";

const HiddenFrameStyle = {
  display: "none",
  position: "fixed",
  top: 0,
  height: "100%",
  left: 0,
  width: "100%",
  zIndex: Number.MAX_SAFE_INTEGER,
};

export const createSandboxedIframe = (
  content: any,
  permissions: string[] = ["allow-scripts"]
): HTMLIFrameElement => {
  const { document } = window;
  const { body } = document;
  // Create a new frame element
  const frame: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null so this is important to be done before anything else
  body.insertBefore(frame, body.firstElementChild);
  // Now set it's content to the specified
  const { contentWindow, contentDocument } = frame;
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  // Now sandbox it
  frame.setAttribute("style", cssToString(HiddenFrameStyle));
  frame.setAttribute("sandbox", permissions.join(" "));
  // Now we can export
  return frame;
};
