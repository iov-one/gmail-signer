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
  return (
    "appProperties" in file &&
    "saved" in (file as MnemonicSavedData).appProperties
  );
};

export const isMnemonicData = (
  file: MnemonicData | any,
): file is MnemonicData => {
  return (
    "appProperties" in file &&
    "mnemonic" in (file as MnemonicData).appProperties
  );
};

export const isFileId = (file: any | FileId): file is FileId => {
  return "id" in file && typeof (file as FileId).id === "string";
};
