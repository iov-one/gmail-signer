import { Msg, StdFee } from "@cosmjs/launchpad";

export interface Tx {
  readonly messages: Msg[];
  readonly fee: StdFee;
  readonly chainId: string;
  readonly memo: string;
  readonly accountNumber: string;
  readonly sequence: string;
}

export const isTx = (obj: any | Tx): obj is Tx => {
  if (!("messages" in obj)) return false;
  if (!("fee" in obj)) return false;
  if (!("chainId" in obj)) return false;
  if (!("accountNumber" in obj)) return false;
  return "sequence" in obj;
};
