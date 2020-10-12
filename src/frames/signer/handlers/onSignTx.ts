import { Msg, StdFee } from "@cosmjs/launchpad";
import { Message } from "../../../types/message";

export const onSignTx = async (
  messages: Msg[], 
  fee: StdFee, 
  chainId: string, 
  memo = "",
  accountNumber: number, 
  sequenceNumber: number, 
): Promise<Message> => {
  const { wallet } = window;
  return {
    target: "Root",
    type: "SendSignedTx",
    data: await wallet.sign(messages, fee, chainId, memo, accountNumber, sequenceNumber),
  };
};
