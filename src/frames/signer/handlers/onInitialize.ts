import { Wallet } from "frames/signer/wallet";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onInitialize = async (
  wallet: Wallet,
  mnemonic: string,
): Promise<Message<RootActions | ErrorActions, string | Error | undefined>> => {
  // Now we can initialize the wallet
  try {
    // FIXME: parametrize path and prefix
    await wallet.initialize(mnemonic, "m/44'/234'/0'/0/0", "star");
    return {
      target: "Root",
      type: RootActions.SignerReady,
      data: undefined,
    };
  } catch (error) {
    if (typeof error === "string") {
      return {
        target: "Root",
        type: ErrorActions.InitializationFailed,
        data: error,
      };
    } else if (error instanceof Error) {
      return {
        target: "Root",
        type: ErrorActions.InitializationFailed,
        data: error,
      };
    } else {
      return {
        target: "Root",
        type: ErrorActions.InitializationFailed,
        data: new Error("unknown error"),
      };
    }
  }
};
