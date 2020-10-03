export const createSandboxedIframe = (
  content: any,
  permissions: string[] = ["allow-scripts"]
): Window => {
  const { document } = window;
  const { body } = document;
  if (body === null) {
    console.warn("body is null ... wonder why", document);
    return;
  }
  const iframe: HTMLIFrameElement = document.createElement("iframe");
  // After adding it to the child, the content document becomes
  // non-null
  body.appendChild(iframe);
  // Now set it's content to the loaded sandbox
  const { contentDocument } = iframe;
  // Write the html
  contentDocument.open();
  contentDocument.write(content);
  contentDocument.close();
  // Now sandbox it
  iframe.setAttribute("style", "display: none");
  iframe.setAttribute("sandbox", permissions.join(" "));
  // Now we can export
  return iframe.contentWindow;
};
