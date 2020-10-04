import { CommonError } from "../../types/commonError";
import { FilesData, isMnemonicData } from "../../types/filesData";
import { GoogleAccessToken } from "../../types/googleAccessToken";

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

  /**
   * This method will query the user's saved mnemonic from the gdrive
   * api.
   *
   * @param accessToken The google access from authentication
   *
   * @returns A mnemonic as a string or null if for some reason it cannot fetch it
   */
  export const readMnemonic = async (
    accessToken: GoogleAccessToken
  ): Promise<string> => {
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
        }
        break;
      case 403:
      case 401:
        throw googleErrorToCommonError(await response.json());
    }
  };

  export const writeMnemonic = async (mnemonic: string): Promise<void> => {};
}
