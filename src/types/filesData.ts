export interface MnemonicData {
  readonly appProperties: {
    readonly mnemonic: string;
  };
}

export interface MnemonicSavedData {
  readonly appProperties: {
    readonly saved: string;
  };
}

export interface FileId {
  readonly id: string;
}

export interface FilesData {
  readonly files: ReadonlyArray<MnemonicData | FileId>;
}

export const isMnemonicSavedData = (
  file: MnemonicSavedData | any,
): file is MnemonicSavedData => {
  return "appProperties" in file && "saved" in file.appProperties;
};

export const isMnemonicData = (
  file: MnemonicData | any,
): file is MnemonicData => {
  return "appProperties" in file && "mnemonic" in file.appProperties;
};

export const isFileId = (file: any): file is FileId => {
  return "id" in file && typeof file.id === "string";
};
