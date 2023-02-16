import { isSignable, Signable } from "../types/signable";

export interface SignRequest {
  readonly signable: Signable;
  readonly authorizationPath: string;
}

export const isTxSignRequest = (obj: any | SignRequest): obj is SignRequest => {
  if (obj === undefined || obj === null) return false;
  const typed: SignRequest = obj as SignRequest;
  if (!isSignable(typed.signable)) {
    return false;
  } else {
    return "authorizationPath" in obj;
  }
};
