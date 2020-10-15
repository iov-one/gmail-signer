import { SignerConfig } from "../signer";
import { Message } from "../types/message";
import { createMessageCallback } from "../utils/createMessageCallback";
import { sendMessage } from "../utils/sendMessage";
import { onGetAddress } from "./signer/handlers/onGetAddress";
import { onInitialize } from "./signer/handlers/onInitialize";
import { onSignTx } from "./signer/handlers/onSignTx";
import { Wallet } from "./signer/wallet";

declare global {
  interface Window {
    wallet: Wallet;
    signerConfig: SignerConfig;
  }
}

const handleMessage = async (message: Message): Promise<Message | null> => {
  const { data } = message;
  switch (message.type) {
    case "Initialize":
      return onInitialize(data);
    case "SignTx":
      try {
        return await onSignTx(
          data.messages,
          data.fee,
          data.chainId,
          data.memo,
          data.accountNumber,
          data.sequence
        );
      } catch (error: any) {
        return {
          target: "Root",
          type: "Error",
          data: error,
        };
      }
    case "GetAddress":
      return onGetAddress();
    default:
      console.warn("unknown message: " + message.type);
  }
};

const onMessage = async (message: Message): Promise<void> => {
  if (message.target !== "Signer") {
    throw new Error("unknown message type cannot be handled");
  } else {
    const response: Message | null = await handleMessage(message);
    if (response !== null) {
      sendMessage(parent, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    }
  }
};

window.onmessage = createMessageCallback(onMessage);
// Entry point for the signer
window.onload = (): void => {
  window.wallet = new Wallet();
  sendMessage(parent, {
    target: "Root",
    type: "Sandboxed",
    data: undefined,
  });
};
