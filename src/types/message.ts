import { ActionType } from "types/actionType";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";

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
  object: Message<CustodianActions> | any,
): object is Message<CustodianActions> => {
  if (!isMessage(object)) return false;
  const actionTypes = Object.values(CustodianActions);
  return actionTypes.includes(object.type);
};

export const isSignerMessage = (
  object: Message<SignerActions> | any,
): object is Message<SignerActions> => {
  if (!isMessage(object)) return false;
  const actionTypes = Object.values(SignerActions);
  return actionTypes.includes(object.type);
};

export const isRootMessage = (
  object: Message<RootActions> | any,
): object is Message<RootActions> => {
  if (!isMessage(object)) return false;
  const actionTypes = Object.values(RootActions);
  return actionTypes.includes(object.type);
};

export const isErrorMessage = (
  object: Message<ErrorActions> | any,
): object is Message<ErrorActions> => {
  if (!isMessage(object)) return false;
  const actionTypes = Object.values(ErrorActions);
  return actionTypes.includes(object.type);
};
