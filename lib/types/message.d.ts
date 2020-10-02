export declare type TargetType = "Custodian" | "Signer" | "Root";
export interface Message<T = any> {
    readonly type: string;
    readonly target: TargetType;
    readonly data: T;
}
export declare const isMessage: (object: any) => object is Message<any>;
