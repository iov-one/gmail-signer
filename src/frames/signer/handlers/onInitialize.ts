import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onInitialize = async (
  mnemonic: string,
): Promise<Message<RootActions | ErrorActions>> => {
  const { wallet } = window;
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
    return {
      target: "Root",
      type: ErrorActions.InitializationFailed,
      data: error,
    };
  }
};
