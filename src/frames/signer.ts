import { StdSignature } from "@cosmjs/launchpad";
import { FRAME_CREATED_AND_LOADED } from "frames/constants";
import { onGetAddress } from "frames/signer/handlers/onGetAddress";
import { onInitialize } from "frames/signer/handlers/onInitialize";
import { onSignTx } from "frames/signer/handlers/onSignTx";
import { Wallet } from "frames/signer/wallet";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { Tx } from "types/tx";
import { createMessageCallback } from "utils/createMessageCallback";
import { sendMessage } from "utils/sendMessage";

const handleMessage = async (
  message: Message<SignerActions, Tx | string>,
): Promise<Message<
  RootActions | ErrorActions,
  Error | StdSignature | string
> | null> => {
  const { data } = message;
  switch (message.type) {
    case SignerActions.Initialize:
      if (typeof data === "string") {
        return onInitialize(data);
      } else {
        return {
          target: "Root",
          type: ErrorActions.Forwarded,
          data: new Error(
            `the ${SignerActions.Initialize} action only accepts a string as a parameter`,
          ),
        };
      }
    case SignerActions.SignTx:
      try {
        if (typeof data !== "string") {
          return onSignTx(
            data.messages,
            data.fee,
            data.chainId,
            data.memo,
            Number(data.accountNumber),
            Number(data.sequence),
          );
        } else {
          return {
            target: "Root",
            type: ErrorActions.Forwarded,
            data: Error(
              `the ${SignerActions.SignTx} action only accepts a tx as a parameter`,
            ),
          };
        }
      } catch (error) {
        return {
          target: "Root",
          type: ErrorActions.Forwarded,
          data: error as Error,
        };
      }
    case SignerActions.GetAddress:
      return onGetAddress();
    default:
      console.warn(`unknown message: ${message.type as string}`);
  }
};

const onMessage = async (message: Message<SignerActions>): Promise<void> => {
  if (message.target !== "Signer") {
    console.warn(
      `message sent to \`Signer' but meant for \`${message.target}'`,
      message,
    );
  } else {
    const response: Message<
      RootActions | ErrorActions,
      Error | StdSignature | string
    > | null = await handleMessage(message);
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

// Entry point for the signer
window.onload = (): void => {
  window.wallet = new Wallet();
  // Announce initialization
  window.dispatchEvent(new Event(FRAME_CREATED_AND_LOADED));
  // Attach the event listener
  window.addEventListener("message", createMessageCallback(onMessage));
  // Send the very first message to the parent window
  sendMessage(parent, {
    target: "Root",
    type: RootActions.Sandboxed,
    data: undefined,
  });
};
