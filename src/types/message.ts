export type TargetType = "Custodian" | "Signer" | "Root";

export interface Message<T = any> {
  readonly uid?: string;
  readonly type: string;
  readonly target: TargetType;
  readonly data?: T;
}

export const isMessage = (object: any): object is Message => {
  if (typeof object !== "object") return false;
  if ("target" in object && "type" in object) {
    return ["Custodian", "Signer", "Root"].some(
      (item: string): boolean => item === object.target
    );
  } else {
    return false;
  }
};
