import { isTx, Tx } from "types/tx";

export interface TxSignRequest {
  readonly transaction: Tx;
  readonly authorizationPath: string;
}

export const isTxSignRequest = (obj: any | Tx): obj is TxSignRequest => {
  if (obj === undefined || obj === null) return false;
  const typed: TxSignRequest = obj as TxSignRequest;
  if (!isTx(typed.transaction)) {
    return false;
  } else {
    return "authorizationPath" in obj;
  }
};
