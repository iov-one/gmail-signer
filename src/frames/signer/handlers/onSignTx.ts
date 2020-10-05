import { StdTx } from "@cosmjs/launchpad";
import { Message } from "../../../types/message";

export const onSignTx = async (tx: StdTx): Promise<Message> => {
  const { wallet } = window;
  return {
    target: "Root",
    type: "SendSignedTx",
    data: await wallet.signTx(tx),
  };
};
