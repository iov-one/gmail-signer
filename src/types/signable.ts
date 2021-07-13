import { AminoSignResponse, StdSignDoc } from "@cosmjs/launchpad";
import { DirectSignResponse } from "@cosmjs/proto-signing";
import { SignDoc } from "@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx";

export type Signable = SignDoc | StdSignDoc;
export type SignResponse = AminoSignResponse | DirectSignResponse;

export const isSignDoc = (signable: any | Signable): signable is SignDoc => {
  const possibleSignDoc = signable as SignDoc;
  return (
    possibleSignDoc.accountNumber !== undefined &&
    possibleSignDoc.chainId !== undefined &&
    possibleSignDoc.authInfoBytes !== undefined &&
    possibleSignDoc.bodyBytes !== undefined
  );
};

export const isStdSignDoc = (
  signable: any | Signable,
): signable is StdSignDoc => {
  const possibleStdSignDoc = signable as StdSignDoc;
  return (
    possibleStdSignDoc.fee !== undefined &&
    possibleStdSignDoc.chain_id !== undefined &&
    possibleStdSignDoc.sequence !== undefined &&
    possibleStdSignDoc.msgs !== undefined &&
    possibleStdSignDoc.account_number !== undefined
  );
};

export const isSignable = (obj: any | Signable): obj is Signable => {
  return isStdSignDoc(obj) || isSignDoc(obj);
};
