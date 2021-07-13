import { Wallet } from "frames/signer/wallet";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onGetAddress = async (
  wallet: Wallet,
): Promise<Message<RootActions | ErrorActions, string>> => {
  const address: string | undefined = await wallet.getAddress();
  if (address === undefined) {
    return {
      target: "Root",
      type: ErrorActions.WalletNotInitialized,
      data: "Wallet not initialized",
    };
  } else {
    return {
      target: "Root",
      type: RootActions.SendAddress,
      data: address,
    };
  }
};

export const onGetPublicKey = async (
  wallet: Wallet,
): Promise<Message<RootActions | ErrorActions, string>> => {
  const pubKey: string | undefined = await wallet.getPublicKey();
  if (pubKey === undefined) {
    return {
      target: "Root",
      type: ErrorActions.WalletNotInitialized,
      data: "Wallet not initialized",
    };
  } else {
    return {
      target: "Root",
      type: RootActions.SendPublicKey,
      data: pubKey,
    };
  }
};
