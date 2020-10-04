import { Message } from "../../../types/message";
import { Wallet } from "../wallet";

export const onInitialize = async (
  mnemonic: string,
  wallet: Wallet
): Promise<Message> => {
  // Now we can initialize the wallet
  try {
    await wallet.initialize(mnemonic, "m/44'/234'/0'/0/0", "star");
    // WARNING: debug only, print the address
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
