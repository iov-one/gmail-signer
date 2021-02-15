import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onGetAddress = async (): Promise<
  Message<RootActions | ErrorActions, string>
> => {
  const { wallet } = window;
  const address: string = await wallet.getAddress();
  if (address === undefined) {
    return {
      target: "Root",
      type: ErrorActions.WalletNotInitialized,
      data: "Wallet not initialized",
    };
  } else {
    return {
      target: "Root",
      type: RootActions.SendAddress,
      data: address,
    };
  }
};
