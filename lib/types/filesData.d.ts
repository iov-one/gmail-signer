export interface MnemonicData {
    readonly appProperties: {
        readonly mnemonic: string;
    };
}
export interface FilesData {
    readonly files: ReadonlyArray<MnemonicData>;
}
export declare const isMnemonicData: (file: any) => file is MnemonicData;
