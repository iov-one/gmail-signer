import {
  AccountData,
  DirectSecp256k1HdWalletOptions,
} from "@cosmjs/proto-signing";
import { FRAME_CREATED_AND_LOADED } from "frames/constants";
import {
  onGetAddress,
  onGetPublicKey,
} from "frames/signer/handlers/onGetAddress";
import { onInitialize } from "frames/signer/handlers/onInitialize";
import { onSignTx } from "frames/signer/handlers/onSignTx";
import { Wallet } from "frames/signer/wallet";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";
import { Signable, SignResponse } from "types/signable";
import { SignerActions } from "types/signerActions";
import { isTxSignRequest } from "types/signRequest";
import { SimplifiedDirectSecp256k1HdWalletOptions } from "types/simplifiedDirectSecp256k1HdWalletOptions";
import { createMessageCallback } from "utils/createMessageCallback";
import { sendMessage } from "utils/sendMessage";

import { onGetAddressGroup } from "./signer/handlers/onGetAddressGroup";

const moduleGlobals: { wallet: Wallet; authorizationPath: string | null } = {
  wallet: new Wallet(),
  authorizationPath: null,
};

const handleMessage = async (
  message: Message<
    SignerActions,
    Signable | { [key: string]: DirectSecp256k1HdWalletOptions } | string
  >,
): Promise<Message<
  RootActions | ErrorActions,
  | Error
  | SignResponse
  | { [key: string]: ReadonlyArray<AccountData> }
  | string
  | undefined
> | null> => {
  const { data } = message;
  switch (message.type) {
    case SignerActions.Initialize:
      if (typeof data === "string") {
        return onInitialize(moduleGlobals.wallet, data);
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
        if (isTxSignRequest(data)) {
          return onSignTx(moduleGlobals.wallet, data);
        } else {
          return {
            target: "Root",
            type: ErrorActions.Forwarded,
            data: Error(`invalid parameter for ${SignerActions.SignTx}`),
          };
        }
      } catch (error) {
        return {
          target: "Root",
          type: ErrorActions.Forwarded,
          data: error as Error,
        };
      }
    case SignerActions.GetAddressGroup:
      return onGetAddressGroup(moduleGlobals.wallet, data);
    case SignerActions.GetAddress:
      return onGetAddress(moduleGlobals.wallet);
    case SignerActions.GetPublicKey:
      return onGetPublicKey(moduleGlobals.wallet);
    default:
      console.warn(`unknown message: ${message.type as string}`);
      return null;
  }
};

const onMessage = async (
  message: Message<SignerActions, string | Signable>,
): Promise<void> => {
  if (message.target !== "Signer") {
    console.warn(
      `message sent to \`Signer' but meant for \`${message.target}'`,
      message,
    );
  } else {
    const response: Message<
      RootActions | ErrorActions,
      | Error
      | SignResponse
      | { [key: string]: ReadonlyArray<AccountData> }
      | string
      | undefined
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
window.addEventListener("load", (): void => {
  // Announce initialization
  parent.postMessage(FRAME_CREATED_AND_LOADED, location.origin);
  // Attach the event listener
  window.addEventListener(
    "message",
    createMessageCallback<SignerActions, string | Signable>(onMessage),
  );
  // Send the very first message to the parent window
  sendMessage(parent, {
    target: "Root",
    type: RootActions.Sandboxed,
    data: undefined,
  });
});
