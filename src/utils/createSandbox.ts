import sandbox from "../templates/signer.html";

export const createSandbox = (): Window => {
  const { body } = document;
  const iframe: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null
  body.appendChild(iframe);
  // Now set it's content to the loaded sandbox
  const { contentDocument } = iframe;
  // Write the html
  contentDocument.write(sandbox);
  // Now sandbox it
  iframe.setAttribute("style", "display: none");
  iframe.setAttribute("sandbox", "allow-scripts");
  // Now we can export
  return iframe.contentWindow;
};
