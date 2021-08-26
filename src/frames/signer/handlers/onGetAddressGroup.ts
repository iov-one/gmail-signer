import { AccountData } from "@cosmjs/amino";
import { stringToPath } from "@cosmjs/crypto";
import { DirectSecp256k1HdWalletOptions } from "@cosmjs/proto-signing";
import { Wallet } from "frames/signer/wallet";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";
import { SimplifiedDirectSecp256k1HdWalletOptions } from "types/simplifiedDirectSecp256k1HdWalletOptions";

const convertToDirectSecp256keHdWalletOptions = (
  originalOptions: SimplifiedDirectSecp256k1HdWalletOptions,
): Partial<DirectSecp256k1HdWalletOptions> => {
  const { hdPaths } = originalOptions;
  return {
    hdPaths: hdPaths.map(stringToPath),
    prefix: originalOptions.prefix,
  };
};

export const onGetAddressGroup = async (
  wallet: Wallet,
  data: any,
): Promise<
  Message<
    RootActions | ErrorActions,
    { [key: string]: ReadonlyArray<AccountData> }
  >
> => {
  const options = data as {
    [key: string]: SimplifiedDirectSecp256k1HdWalletOptions;
  };
  const keys = Object.keys(options);
  const values = Object.values(options);
  const items = await Promise.all(
    values.map(
      (
        options: SimplifiedDirectSecp256k1HdWalletOptions,
      ): Promise<ReadonlyArray<AccountData>> =>
        wallet.getExtraAccounts(
          convertToDirectSecp256keHdWalletOptions(options),
        ),
    ),
  );

  return {
    target: "Root",
    type: RootActions.SendAddress,
    data: keys.reduce(
      (
        map: { [key: string]: ReadonlyArray<AccountData> },
        key: string,
        index: number,
      ): { [key: string]: ReadonlyArray<AccountData> } => {
        return { ...map, [key]: items[index] };
      },
      {},
    ),
  };
};
