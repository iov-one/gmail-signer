import {
  CUSTODIAN_AUTH_COMPLETED_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
  CUSTODIAN_SIGN_IN_REQUEST,
  FRAME_CREATED_AND_LOADED,
} from "frames/constants";
import { GDriveApi } from "frames/custodian/gDriveApi";
import { onAbandon } from "frames/custodian/handlers/onAbandon";
import { onDeleteAccount } from "frames/custodian/handlers/onDeleteAccount";
import { onSignOut } from "frames/custodian/handlers/onSignOut";
import { getCurrentUser } from "frames/custodian/helpers/getCurrentUser";
import { onRootMessage } from "frames/custodian/helpers/onRootMessage";
import { onSignerMessage } from "frames/custodian/helpers/onSignerMessage";
import { readOrCreateMnemonic } from "frames/custodian/helpers/readOrCreateMnemonic";
import { sendAuthMessage } from "frames/custodian/helpers/sendAuthMessage";
import { showMnemonic } from "frames/custodian/helpers/showMnemonic";
import { transformGooglesResponse } from "frames/custodian/helpers/transformGooglesResponse";
import { getFrameSpecificData } from "frames/helpers/getFrameSpecificData";
import { gapi } from "gapi";
import { SignerConfiguration } from "signer";
import signer from "templates/signer.html";
import { ActionType } from "types/actionType";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { GenericMessage } from "types/genericMessage";
import {
  GoogleAccessToken,
  isGoogleAccessToken,
} from "types/googleAccessToken";
import { GoogleAuthInfo } from "types/googleAuthInfo";
import { isGoogleAuthError } from "types/googleOAuthError";
import {
  isCustodianMessage,
  isRootMessage,
  isSignerMessage,
  Message,
} from "types/message";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { createMessageCallback } from "utils/createMessageCallback";
import { createTemporaryMessageListener } from "utils/createTemporaryMessageListener";
import { sandboxFrame } from "utils/sandboxFrame";
import { sendMessage } from "utils/sendMessage";

import Auth = gapi.Auth;

const gapi = window.gapi;

const moduleGlobals: { accessToken: GoogleAccessToken | null } = {
  accessToken: null,
};

const signOutFromGoogle = async (): Promise<void> => {
  const { auth2 } = gapi;
  const instance: Auth = auth2.getAuthInstance();
  return instance.signOut();
};

const handleMessage = async (
  message: Message<CustodianActions, GoogleAccessToken | string | undefined>,
): Promise<Message<
  RootActions | ErrorActions | SignerActions,
  Error | boolean | string | undefined
> | null> => {
  switch (message.type) {
    case CustodianActions.ShowMnemonic:
      if (!isGoogleAccessToken(moduleGlobals.accessToken))
        throw new Error("user did not authenticate yet");
      if (typeof message.data !== "string")
        throw new Error(
          "invalid request, for us to send you the mnemonic you need to specify a path",
        );
      return {
        target: "Root",
        type: RootActions.SendShowMnemonicResult,
        data: await showMnemonic(moduleGlobals.accessToken, message.data),
      };
    case CustodianActions.GetIsMnemonicSafelyStored:
      if (!isGoogleAccessToken(moduleGlobals.accessToken))
        throw new Error("user did not authenticate yet");
      return {
        target: "Root",
        type: RootActions.SendIsMnemonicSafelyStored,
        data: await GDriveApi.isMnemonicSafelyStored(moduleGlobals.accessToken),
      };
    case CustodianActions.DeleteAccount:
      if (!isGoogleAccessToken(moduleGlobals.accessToken))
        throw new Error("user did not authenticate yet");
      return onDeleteAccount(moduleGlobals.accessToken);
    case CustodianActions.SignOut:
      await signOutFromGoogle();
      return onSignOut();
    case CustodianActions.Abandon:
      if (!isGoogleAccessToken(moduleGlobals.accessToken))
        throw new Error("user did not authenticate yet");
      return onAbandon(moduleGlobals.accessToken);
  }
};

const onCustodianMessage = async (
  message: Message<CustodianActions>,
): Promise<void> => {
  const response: Message<
    RootActions | SignerActions | ErrorActions,
    Error | boolean | string | undefined
  > | null = await handleMessage(message);
  if (response !== null) {
    const targetWindow: Window | undefined =
      response.target === "Signer" ? frames[0] : parent;
    if (targetWindow === undefined) {
      console.warn(
        "cannot respond to the message or request, because there's no target window",
      );
    } else {
      sendMessage(targetWindow, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    }
  }
};

const onMessage = (message: Message<ActionType, any>): Promise<void> | void => {
  switch (message.target) {
    case "Custodian":
      if (isCustodianMessage(message)) {
        return onCustodianMessage(message);
      }
      break;
    case "Signer":
      if (isSignerMessage(message)) {
        return onSignerMessage(message);
      }
      break;
    case "Root":
      if (isRootMessage(message)) {
        return onRootMessage(message);
      }
      break;
    default:
      console.warn("unknown type of message received");
  }
};

interface GoogleFrameMessage {
  result: {
    error: string | null;
  };
}

const setupAuthButton = (auth2: gapi.Auth, signer: Window): void => {
  const signIn = async (): Promise<void> => {
    sendAuthMessage(CUSTODIAN_AUTH_STARTED_EVENT);
    const currentUser: gapi.User = getCurrentUser(auth2);
    try {
      const user: gapi.User = currentUser.isSignedIn()
        ? currentUser
        : await auth2.signIn();
      // Create the wallet (ask the signer to do so actually)
      const authInfo: GoogleAuthInfo = transformGooglesResponse(user);
      // Make the access token "global"
      moduleGlobals.accessToken = authInfo.accessToken;
      // Create the wallet
      const mnemonic: string = await readOrCreateMnemonic(
        moduleGlobals.accessToken,
      );
      // Now initialize the signer
      signer.postMessage(
        {
          target: "Signer",
          type: SignerActions.Initialize,
          data: mnemonic,
        },
        location.origin,
      );
      // Now let the signer know
      sendAuthMessage(CUSTODIAN_AUTH_SUCCEEDED_EVENT, authInfo);
    } catch (error) {
      if (isGoogleAuthError(error)) {
        sendAuthMessage(CUSTODIAN_AUTH_FAILED_EVENT, error.error);
      } else {
        sendAuthMessage(CUSTODIAN_AUTH_FAILED_EVENT, error);
      }
    } finally {
      sendAuthMessage(CUSTODIAN_AUTH_COMPLETED_EVENT);
    }
  };
  // Listen for sign-in requests, and do so "forever"
  createTemporaryMessageListener(
    async (source: Window, data?: GenericMessage): Promise<boolean> => {
      if (data === undefined) return false;
      if (data.type === CUSTODIAN_SIGN_IN_REQUEST) {
        await signIn();
      }
      return false;
    },
    {
      "https://accounts.google.com": (data: any): boolean => {
        // Check for errors here
        const dataObject: GoogleFrameMessage = JSON.parse(
          data,
        ) as GoogleFrameMessage;
        if (dataObject.result) {
          const { error } = dataObject.result;
          if (error) {
            sendAuthMessage(CUSTODIAN_AUTH_FAILED_EVENT, error);
            return true;
          }
        }
        return false;
      },
    },
  );
};

const setupGoogleApi = async (
  frame: HTMLIFrameElement,
  clientID: string,
): Promise<void> => {
  return new Promise(
    (resolve: () => void, reject: (error: Error | string) => void): void => {
      gapi.load("auth2", {
        callback: (): void => {
          gapi.auth2
            .init({
              client_id: clientID,
              scope: "https://www.googleapis.com/auth/drive.appdata",
              cookiepolicy: "single_host_origin",
              fetch_basic_profile: true,
              prompt: "select_account",
            })
            .then((auth2: gapi.Auth): void => {
              if (frame.contentWindow !== null) {
                setupAuthButton(auth2, frame.contentWindow);
              } else {
                reject(new Error("could not create the signer iframe"));
              }
              resolve();
            })
            .catch((error) => {
              reject(error);
            });
        },
        onerror: (error): void => {
          reject(error);
        },
      });
    },
  );
};

const createSignerAndInstallMessagesHandler = async (): Promise<void> => {
  const frame: HTMLIFrameElement = await sandboxFrame(signer, "signer");
  const { googleClientID } = await getFrameSpecificData<SignerConfiguration>();
  // Setup the google api stuff
  await setupGoogleApi(frame, googleClientID);
  // Attach the event listener for message exchange
  window.addEventListener("message", createMessageCallback(onMessage));
  // Finally announce initialization
  parent.postMessage(FRAME_CREATED_AND_LOADED, location.origin);
};

window.addEventListener("load", (): void => {
  void createSignerAndInstallMessagesHandler();
});
