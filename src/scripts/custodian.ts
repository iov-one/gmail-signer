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
  getCurrentMnemonic(accessToken).then((mnemonic: string | null): void => {
    if (mnemonic === null) {
      sendMessage(parent, {
        target: "Root",
        type: "RequestMnemonicCreation",
        data: undefined,
      });
    } else {
      sendMessage(parent, {
        target: "Signer",
        type: "Initialize",
        data: mnemonic,
      });
    }
  });
};

const handleMessage = (message: Message): void => {
  switch (message.type) {
    case "Authenticated":
      return onAuthenticated(message.data);
    default:
      console.warn("unknown message: " + message.type);
  }
};

window.onmessage = createMessageCallback((message: Message) => {
  if (message.target !== "Custodian") {
    // We can only accept 1 type of message
    throw new Error("unknown message type cannot be handled");
  } else {
    return handleMessage(message);
  }
});

// Notify my existence
setTimeout(() => {
  sendMessage(parent, {
    target: "Root",
    type: "CustodianReady",
    data: undefined,
  });
}, 0);
