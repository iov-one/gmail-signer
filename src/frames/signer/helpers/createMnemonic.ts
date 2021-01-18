import { Secp256k1Wallet } from "@cosmjs/launchpad";

import { parseHDPath } from "../parseHDPath";

export const createMnemonic = async (): Promise<string> => {
  const wallet: Secp256k1Wallet = await Secp256k1Wallet.generate(
    12,
    parseHDPath("m/44'/234'/0'/0/0"),
    "star",
  );
  return wallet.mnemonic;
};
