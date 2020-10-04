import { Slip10RawIndex } from "@cosmjs/crypto";
import { Secp256k1Wallet } from "@cosmjs/launchpad";
import { Message } from "../../../types/message";
import { parseHDPath } from "../parseHDPath";

export const onCreateAccount = async (
  hdPath: string,
  prefix: string
): Promise<Message> => {
  const wallet: Secp256k1Wallet = await Secp256k1Wallet.generate(
    24,
    parseHDPath(hdPath),
    prefix
  );
  return {
    target: "Custodian",
    type: "SaveMnemonic",
    data: wallet.mnemonic,
  };
};
