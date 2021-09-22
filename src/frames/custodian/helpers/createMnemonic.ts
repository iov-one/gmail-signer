import { stringToPath } from "@cosmjs/crypto";
import { Secp256k1HdWallet } from "@cosmjs/launchpad";

export const createMnemonic = async (length: 12 | 24): Promise<string> => {
  const wallet = await Secp256k1HdWallet.generate(length, {
    hdPaths: [stringToPath("m/44'/234'/0'/0/0")],
    prefix: "star",
  });
  return wallet.mnemonic;
};
