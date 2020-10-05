export interface MnemonicData {
  readonly appProperties: {
    readonly mnemonic: string;
  };
}

export interface FileId {
  readonly id: string;
}

export interface FilesData {
  readonly files: ReadonlyArray<MnemonicData | FileId>;
}

export const isMnemonicData = (file: any): file is MnemonicData => {
  return "appProperties" in file && "mnemonic" in file.appProperties;
};

export const isFileId = (file: any): file is FileId => {
  return "id" in file && typeof file.id === "string";
};
