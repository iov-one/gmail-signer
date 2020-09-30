export interface MnemonicData {
  readonly appProperties: {
    readonly mnemonic: string;
  };
}

export interface FilesData {
  readonly files: ReadonlyArray<MnemonicData>;
}

export const isMnemonicData = (file: any): file is MnemonicData => {
  return "appProperties" in file && "mnemonic" in file.appProperties;
};
