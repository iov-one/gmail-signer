import { CommonError } from "../../types/commonError";
import { FilesData, isFileId, isMnemonicData } from "../../types/filesData";

export namespace GDriveApi {
  interface Error {
    readonly error: {
      readonly errors: ReadonlyArray<{
        readonly domain: string;
        readonly reason: string;
        readonly message: string;
        readonly extendedHelp: string;
      }>;
      readonly code: number;
      readonly message: string;
    };
  }

  /**
   * Custom special error for not-found situation
   *
   * @private
   */
  export const NotFoundError: CommonError = {
    message: "mnemonic not found for this account",
  };

  /**
   * Build a common error from the error sent by google, having common errors
   * type is good for understanding the errors when some function gets them
   *
   * @param errorContainer
   */
  const googleErrorToCommonError = (errorContainer: Error): CommonError => {
    const { error } = errorContainer;
    return {
      message: error.message,
      data: error.errors,
    };
  };

  const getFileId = async (): Promise<string> => {
    const { accessToken } = window;
    const query: string[] = [
      "name='mnemonic.txt'",
      "appProperties has 'tag'",
      "appDataFolder in parents",
      "spaces=appDataFolder",
      "fields=files(id)",
      "orderBy=modifiedTime desc",
      "pageSize=1",
    ];
    const response: Response = await fetch(
      `https://www.googleapis.com/drive/v3/files/?q=${query.join("&")}`,
      {
        method: "GET",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
        },
      }
    );
    switch (response.status) {
      case 200:
        const filesData: FilesData = await response.json();
        const { files } = filesData;
        if (files.length === 0) {
          throw NotFoundError;
        } else if (isFileId(files[0])) {
          return files[0].id;
        }
        break;
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
    }
  };

  /**
   * This method will query the user's saved mnemonic from the gdrive
   * api.
   *
   * @returns A mnemonic as a string or null if for some reason it cannot fetch it
   */
  export const readMnemonic = async (): Promise<string> => {
    const { accessToken } = window;
    const query: string[] = [
      "name='mnemonic.txt'",
      "appProperties has 'tag'",
      "appDataFolder in parents",
      "spaces=appDataFolder",
      "fields=files(appProperties/mnemonic)",
      "orderBy=modifiedTime desc",
      "pageSize=1",
    ];
    const response: Response = await fetch(
      `https://www.googleapis.com/drive/v3/files/?q=${query.join("&")}`,
      {
        method: "GET",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
        },
      }
    );
    switch (response.status) {
      case 200:
        const filesData: FilesData = await response.json();
        const { files } = filesData;
        if (files.length === 0) {
          throw NotFoundError;
        } else if (isMnemonicData(files[0])) {
          const { appProperties } = files[0];
          return appProperties.mnemonic;
        } else {
          throw NotFoundError;
        }
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
    }
  };

  /**
   * Write the mnemonic to Google Drive
   *
   * @param mnemonic
   */
  export const writeMnemonic = async (mnemonic: string): Promise<void> => {
    const { accessToken } = window;
    const response: Response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "mnemonic.txt",
          appProperties: {
            mnemonic: mnemonic,
            tag: "mnemonic",
          },
          parents: ["appDataFolder"],
        }),
      }
    );
    if (response.status !== 200) {
      throw googleErrorToCommonError(await response.json());
    }
  };

  /**
   * Delete the mnemonic from Google Drive
   */
  export const deleteMnemonic = async (): Promise<void> => {
    const { accessToken } = window;
    // FIXME: do get the id
    const id: string = await getFileId();
    const response: Response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
        },
      }
    );
    if (response.status !== 204) {
      throw googleErrorToCommonError(await response.json());
    }
  };

  export const revokeToken = async (): Promise<void> => {
    const { accessToken } = window;
    const response: Response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken.token}`,
      {
        method: "POST",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (response.status !== 200) {
      throw googleErrorToCommonError(await response.json());
    }
  };
}
