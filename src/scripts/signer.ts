import { Message } from "../types/message";
import { createMessageCallback } from "../utils/createMessageCallback";
import { sendMessage } from "../utils/sendMessage";
import { ChildContainer } from "./signerSources/childContainer";
import { WalletContainer } from "./signerSources/walletContainer";

const childContainer: ChildContainer = new ChildContainer();
const walletContainer: WalletContainer = new WalletContainer();

const onInitializeMessage = (mnemonic: string): void => {
  // Now we can initialize the wallet
  walletContainer
    .createWallet(mnemonic)
    .then((): void => {
      sendMessage(parent, {
        target: "Root",
        type: "SignerReady",
        data: undefined,
      });
    })
    .catch((error: any): void => {
      sendMessage(parent, {
        target: "Root",
        type: "Error",
        data: error,
      });
    });
};

const handleMessage = (message: Message): void => {
  switch (message.type) {
    case "Initialize":
      return onInitializeMessage(message.data);
    case "SignTx":
      break;
    case "GetAddress":
      break;
    default:
      console.warn("unknown message: " + message.type);
  }
};

const onMessage = (message: Message): void => {
  switch (message.target) {
    case "Custodian":
      const { childWindow } = childContainer;
      // This message belongs to the child frame, so
      // we must redirect it
      if (childWindow === null) {
        throw new Error(
          "cannot forward this message, not initialized properly"
        );
      }
      // Send as is, we don't want to use this
      return sendMessage(childWindow, message);
    case "Signer":
      return handleMessage(message);
    case "Root":
      return sendMessage(parent, message);
    default:
      throw new Error("unknown message type cannot be handled");
  }
};

window.onmessage = createMessageCallback(onMessage);
