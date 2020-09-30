export interface Message<T = any> {
    readonly type: "Auth" | "Signer" | "Child";
    readonly name: string;
    readonly data: T;
}
export declare const isMessage: (object: any) => object is Message<any>;
