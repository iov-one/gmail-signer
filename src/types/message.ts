export interface Message<T = any> {
  readonly type: "Auth" | "Signer" | "Child";
  readonly name: string;
  readonly data: T;
}

export const isMessage = (object: any): object is Message => {
  if ("type" in object && "name" in object) {
    return object.type === "Auth" || object.type === "Signer";
  } else {
    return false;
  }
};
