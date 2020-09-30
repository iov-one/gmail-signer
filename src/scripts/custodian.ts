import { FilesData, isMnemonicData } from "../types/filesData";
import { Message } from "../types/message";
import { createMessageCallback } from "../utils/createMessageCallback";
import { sendMessage } from "../utils/sendMessage";

const getCurrentMnemonic = async (
  accessToken: GoogleAccessToken
): Promise<string | null> => {
  const query: string[] = [
    "name='mnemonic.txt'",
    "appProperties has 'tag'",
    "appDataFolder in parents",
    "spaces=appDataFolder",
    "fields=files(appProperties/mnemonic)",
    "orderBy=modifiedTime desc",
    "pageSize=1",
  ];
  const response: Response = await fetch(
    `https://www.googleapis.com/drive/v3/files/?q=${query.join("&")}`,
    {
      method: "GET",
      headers: {
        Authorization: `${accessToken.type} ${accessToken.token}`,
      },
    }
  );
  const filesData: FilesData = await response.json();
  const { files } = filesData;
  if (files.length === 0) {
    return null;
  } else if (isMnemonicData(files[0])) {
    const { appProperties } = files[0];
    return appProperties.mnemonic;
  }
};

const onAuthenticated = (accessToken: GoogleAccessToken): void => {
  console.log(accessToken);
  getCurrentMnemonic(accessToken).then((mnemonic: string | null): void => {
    if (mnemonic === null) {
      sendMessage(parent, {
        type: "Child",
        name: "RequestMnemonicCreation",
        data: undefined,
      });
    } else {
      sendMessage(parent, {
        type: "Signer",
        name: "Initialize",
        data: mnemonic,
      });
    }
  });
};

const handleMessage = (message: Message): void => {
  switch (message.name) {
    case "Authenticated":
      return onAuthenticated(message.data);
    default:
      console.warn("unknown message: " + message.name);
  }
};

window.onmessage = createMessageCallback((message: Message) => {
  if (message.type !== "Auth") {
    // We can only accept 1 type of message
    throw new Error("unknown message type cannot be handled");
  } else {
    return handleMessage(message);
  }
});

// Notify my existence
parent.postMessage("AuthFrameReady", "*");
