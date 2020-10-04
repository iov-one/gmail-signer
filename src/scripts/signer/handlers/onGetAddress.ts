import { Message } from "../../../types/message";
import { Wallet } from "../wallet";

export const onGetAddress = async (wallet: Wallet): Promise<Message> => {
  const address: string = await wallet.getAddress();
  if (address === undefined) {
    return {
      target: "Root",
      type: "Error",
      data: "Wallet not initialized",
    };
  } else {
    return {
      target: "Root",
      type: "SendAddress",
      data: address,
    };
  }
};
