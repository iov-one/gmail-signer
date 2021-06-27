import { Secp256k1HdWallet } from "@cosmjs/launchpad";
import { parseHDPath } from "frames/signer/helpers/parseHDPath";

export const createMnemonic = async (): Promise<string> => {
  const wallet = await Secp256k1HdWallet.generate(24, {
    hdPaths: [parseHDPath("m/44'/234'/0'/0/0")],
    prefix: "star",
  });
  return wallet.mnemonic;
};
