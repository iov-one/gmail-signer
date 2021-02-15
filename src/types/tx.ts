import { Msg, StdFee } from "@cosmjs/launchpad";

export interface Tx {
  readonly messages: Msg[];
  readonly fee: StdFee;
  readonly chainId: string;
  readonly memo: string;
  readonly accountNumber: string;
  readonly sequence: string;
}
