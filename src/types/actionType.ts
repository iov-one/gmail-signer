import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";

export type ActionType =
  | RootActions
  | CustodianActions
  | SignerActions
  | ErrorActions;
