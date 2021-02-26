import { entropyToMnemonic, mnemonicToEntropy } from "bip39";
import { CommonError } from "types/commonError";
import {
  FilesData,
  isFileId,
  isMnemonicData,
  isMnemonicSavedData,
} from "types/filesData";
import { GoogleAccessToken } from "types/googleAccessToken";

const InvalidServerResponse: Error = new Error("invalid response from server");

// eslint-disable-next-line
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

  const getFileId = async (accessToken: GoogleAccessToken): Promise<string> => {
    const query: string[] = [
      "name='mnemonic'",
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
      },
    );
    switch (response.status) {
      case 200:
        {
          const filesData = (await response.json()) as FilesData;
          const { files } = filesData;
          if (files.length === 0) {
            throw NotFoundError;
          } else if (isFileId(files[0])) {
            return files[0].id;
          }
        }
        break;
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
      default:
        throw InvalidServerResponse;
    }
    return "";
  };

  const handleSavedQuerySuccess = async (
    response: Response,
  ): Promise<string> => {
    const filesData = (await response.json()) as FilesData;
    const { files } = filesData;
    if (files.length === 0) {
      throw NotFoundError;
    } else if (isMnemonicSavedData(files[0])) {
      const { appProperties } = files[0];
      return appProperties.saved;
    } else {
      throw new Error("cannot read query's response");
    }
  };

  const handleMnemonicQuerySuccess = async (
    response: Response,
  ): Promise<string> => {
    const filesData = (await response.json()) as FilesData;
    const { files } = filesData;
    if (files.length === 0) {
      throw NotFoundError;
    } else if (isMnemonicData(files[0])) {
      const { appProperties } = files[0];
      return entropyToMnemonic(appProperties.seed);
    } else {
      throw NotFoundError;
    }
  };

  /**
   * This method will query the user's saved mnemonic from the gdrive
   * api.
   *
   * @returns A mnemonic as a string or null if for some reason it cannot fetch it
   */
  export const readMnemonic = async (
    accessToken: GoogleAccessToken,
  ): Promise<string> => {
    const query: string[] = [
      "name='seed'",
      "appProperties has 'tag'",
      "appDataFolder in parents",
      "spaces=appDataFolder",
      "fields=files(appProperties/seed)",
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
      },
    );
    switch (response.status) {
      case 200:
        return handleMnemonicQuerySuccess(response);
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
      default:
        throw InvalidServerResponse;
    }
  };

  /**
   * Write the mnemonic to Google Drive
   *
   * @param accessToken
   * @param mnemonic
   */
  export const writeMnemonic = async (
    accessToken: GoogleAccessToken,
    mnemonic: string,
  ): Promise<void> => {
    const response: Response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "seed",
          appProperties: {
            seed: mnemonicToEntropy(mnemonic),
            tag: "seed",
          },
          parents: ["appDataFolder"],
        }),
      },
    );
    if (response.status !== 200) {
      throw googleErrorToCommonError(await response.json());
    }
  };

  export const isMnemonicSafelyStored = async (
    accessToken: GoogleAccessToken,
  ): Promise<boolean> => {
    const query: string[] = [
      "name='saved'",
      "appProperties has 'tag'",
      "appDataFolder in parents",
      "spaces=appDataFolder",
      "fields=files(appProperties/saved)",
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
      },
    );
    switch (response.status) {
      case 200:
        try {
          return (await handleSavedQuerySuccess(response)) === "yes";
        } catch (error) {
          if (error === NotFoundError) {
            return false;
          } else {
            throw error;
          }
        }
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
      default:
        return false;
    }
  };

  export const setMnemonicSafelyStored = async (
    accessToken: GoogleAccessToken,
  ): Promise<void> => {
    const response: Response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "saved",
          appProperties: {
            saved: "yes",
            tag: "saved",
          },
          parents: ["appDataFolder"],
        }),
      },
    );
    if (response.status !== 200) {
      throw googleErrorToCommonError(await response.json());
    }
  };

  /**
   * Delete the mnemonic from Google Drive
   */
  export const deleteMnemonic = async (
    accessToken: GoogleAccessToken,
  ): Promise<void> => {
    // FIXME: do get the id
    const id: string = await getFileId(accessToken);
    const response: Response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
        },
      },
    );
    if (response.status !== 204) {
      throw googleErrorToCommonError(await response.json());
    }
  };

  export const revokeToken = async (
    accessToken: GoogleAccessToken,
  ): Promise<void> => {
    const response: Response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken.token}`,
      {
        method: "POST",
        headers: {
          Authorization: `${accessToken.type} ${accessToken.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    if (response.status !== 200) {
      throw googleErrorToCommonError(await response.json());
    }
  };
}
