import { Message } from "../../../types/message";

export const onGetAddress = async (): Promise<Message> => {
  const { wallet } = window;
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
