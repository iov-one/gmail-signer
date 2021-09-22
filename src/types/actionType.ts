import { CustodianActions } from "./custodianActions";
import { ErrorActions } from "./errorActions";
import { RootActions } from "./rootActions";
import { SignerActions } from "./signerActions";

export type ActionType =
  | RootActions
  | CustodianActions
  | SignerActions
  | ErrorActions;
