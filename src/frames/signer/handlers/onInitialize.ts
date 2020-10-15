import { Message } from "../../../types/message";

export const onInitialize = async (mnemonic: string): Promise<Message> => {
  const { wallet } = window;
  // Now we can initialize the wallet
  try {
    // FIXME: parametrize path and prefix
    await wallet.initialize(mnemonic, "m/44'/234'/0'/0/0", "star");
    return {
      target: "Root",
      type: "SignerReady",
      data: undefined,
    };
  } catch (error: any) {
    return {
      target: "Root",
      type: "Error",
      data: error,
    };
  }
};
