import { stringToPath } from "@cosmjs/crypto";
import { Secp256k1HdWallet } from "@cosmjs/launchpad";

export const createMnemonic = async (): Promise<string> => {
  const wallet = await Secp256k1HdWallet.generate(24, {
    hdPaths: [stringToPath("m/44'/234'/0'/0/0")],
    prefix: "star",
  });
  return wallet.mnemonic;
};
