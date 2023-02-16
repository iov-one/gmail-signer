import { ActionType } from "../types/actionType";
import { CustodianActions } from "../types/custodianActions";
import { ErrorActions } from "../types/errorActions";
import { RootActions } from "../types/rootActions";
import { SignerActions } from "../types/signerActions";

export type TargetType = "Custodian" | "Signer" | "Root";
export interface Message<A extends ActionType, T = undefined> {
  readonly uid?: string;
  readonly type: A;
  readonly target: TargetType;
  readonly data?: T;
}

export const isMessage = (
  object: Message<any> | unknown,
): object is Message<any> => {
  if (typeof object !== "object") return false;
  if (object === null) return false;
  if ("target" in object && "type" in object) {
    const message = object as Message<any>;
    return ["Custodian", "Signer", "Root"].some(
      (item: string): boolean => item === message.target,
    );
  } else {
    return false;
  }
};

export const isCustodianMessage = (
  thing: Message<CustodianActions> | any,
): thing is Message<CustodianActions> => {
  if (!isMessage(thing)) return false;
  const actionTypes = Object.values(CustodianActions);
  return actionTypes.includes(thing.type);
};

export const isSignerMessage = (
  thing: Message<SignerActions> | any,
): thing is Message<SignerActions> => {
  if (!isMessage(thing)) return false;
  const actionTypes = Object.values(SignerActions);
  return actionTypes.includes(thing.type);
};

export const isRootMessage = (
  thing: Message<RootActions> | any,
): thing is Message<RootActions> => {
  if (isErrorMessage(thing)) return true;
  if (!isMessage(thing)) return false;
  const actionTypes = Object.values(RootActions);
  return actionTypes.includes(thing.type);
};

export const isErrorMessage = (
  thing: Message<ErrorActions> | any,
): thing is Message<ErrorActions> => {
  if (!isMessage(thing)) return false;
  const actionTypes = Object.values(ErrorActions);
  return actionTypes.includes(thing.type);
};
