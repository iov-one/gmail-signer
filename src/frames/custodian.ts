import "3rdParty/gapi";

import {
  CUSTODIAN_AUTH_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
  FRAME_CREATED_AND_LOADED,
} from "frames/constants";
import { GDriveApi } from "frames/custodian/gDriveApi";
import { onAbandon } from "frames/custodian/handlers/onAbandon";
import { onAuthenticated } from "frames/custodian/handlers/onAuthenticated";
import { onDeleteAccount } from "frames/custodian/handlers/onDeleteAccount";
import { onSignOut } from "frames/custodian/handlers/onSignOut";
import { showMnemonic } from "frames/custodian/helpers/showMnemonic";
import { gapi } from "gapi";
import signer from "templates/signer.html";
import { ActionType } from "types/actionType";
import { AuthEventDetail } from "types/authEventDetail";
import { CustodianActions } from "types/custodianActions";
import { ErrorActions } from "types/errorActions";
import { GoogleAuthInfo } from "types/gogoleAuthInfo";
import { GoogleAccessToken } from "types/googleAccessToken";
import {
  isCustodianMessage,
  isRootMessage,
  isSignerMessage,
  Message,
} from "types/message";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { createMessageCallback } from "utils/createMessageCallback";
import { createSandboxedIframe } from "utils/createSandboxedIframe";
import { sendMessage } from "utils/sendMessage";

const handleMessage = async (
  message: Message<CustodianActions>,
): Promise<Message<
  RootActions | ErrorActions | SignerActions,
  Error | boolean | string
> | null> => {
  switch (message.type) {
    case CustodianActions.Authenticated:
      window.accessToken = message.data as GoogleAccessToken;
      try {
        return await onAuthenticated();
      } catch (error) {
        window.accessToken = null;
        return {
          target: "Root",
          type: ErrorActions.Forwarded,
          data: error as Error,
        };
      }
    case CustodianActions.ShowMnemonic:
      return {
        target: "Root",
        type: RootActions.SendShowMnemonicResult,
        data: await showMnemonic(message.data),
      };
    case CustodianActions.GetIsMnemonicSafelyStored:
      return {
        target: "Root",
        type: RootActions.SendIsMnemonicSafelyStored,
        data: await GDriveApi.isMnemonicSafelyStored(),
      };
    case CustodianActions.DeleteAccount:
      return onDeleteAccount();
    case CustodianActions.SignOut:
      return onSignOut();
    case CustodianActions.Abandon:
      return onAbandon();
  }
};

const onSignerMessage = (message: Message<SignerActions>): void => {
  if (frames.length === 0) {
    throw new Error("cannot forward this message, not initialized properly");
  }
  // Send as is, we don't want to use this
  return sendMessage(frames[0], message);
};

const onCustodianMessage = async (
  message: Message<CustodianActions>,
): Promise<void> => {
  const response: Message<
    RootActions | SignerActions | ErrorActions,
    Error | boolean | string
  > | null = await handleMessage(message);
  if (response !== null) {
    const targetWindow: Window | undefined =
      response.target === "Signer" ? frames[0] : parent;
    if (targetWindow === undefined) {
      console.warn(
        "cannot forward message to signer because there's no window to send it to",
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

const onRootMessage = (message: Message<RootActions>): void =>
  sendMessage(parent, message);

const onMessage = (message: Message<ActionType>): Promise<void> | void => {
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

const transformGooglesResponse = (user: gapi.GoogleUser): GoogleAuthInfo => {
  const profile: gapi.BasicProfile = user.getBasicProfile();
  const auth = user.getAuthResponse(true);
  const { scope } = auth;
  return {
    accessToken: {
      token: auth.access_token,
      expiresAt: Number(auth.expires_at),
      idToken: auth.id_token,
      type: "Bearer",
      scope: scope.split(" "),
    },
    user: {
      firstName: profile.getGivenName(),
      lastName: profile.getFamilyName(),
      email: profile.getEmail(),
      picture: profile.getImageUrl(),
    },
  };
};

const dispatchCustomEvent = <T>(type: string, data?: T): void => {
  window.dispatchEvent(
    new CustomEvent<AuthEventDetail<T>>(CUSTODIAN_AUTH_EVENT, {
      detail: {
        type,
        data,
      },
    }),
  );
};

const setupAuthButton = (auth2: gapi.GoogleAuth): void => {
  const { application } = window;
  const { button } = application;
  const currentUser = auth2.currentUser.get();
  const onSignedIn = (user: gapi.GoogleUser): void => {
    dispatchCustomEvent(
      CUSTODIAN_AUTH_SUCCEEDED_EVENT,
      transformGooglesResponse(user),
    );
  };
  const onFailure = (reason: string): void => {
    dispatchCustomEvent(CUSTODIAN_AUTH_FAILED_EVENT, new Error(reason));
  };
  const onClick = (): void => {
    dispatchCustomEvent(CUSTODIAN_AUTH_STARTED_EVENT);
    if (currentUser.isSignedIn()) {
      onSignedIn(currentUser);
    }
  };
  if (!currentUser.isSignedIn()) {
    auth2.attachClickHandler(button, {}, onSignedIn, onFailure);
  }
  button.addEventListener("click", onClick, true);
  // Attach the event listener
  window.addEventListener("message", createMessageCallback(onMessage));
};

const google = window.gapi as gapi.Google;

window.initialize = async (): Promise<void> => {
  return new Promise(
    (resolve: () => void, reject: (error: Error | string) => void): void => {
      const { userAgent } = navigator;
      if (userAgent.includes("jsdom")) {
        resolve();
        return;
      }
      google.load("auth2", {
        callback: (): void => {
          const { application } = window;
          const config = {
            client_id: application.clientID,
            scope: "https://www.googleapis.com/auth/drive.appdata",
          };
          google.auth2
            .init(config)
            .then((auth2: gapi.GoogleAuth): void => {
              setupAuthButton(auth2);
              resolve();
            })
            .catch(reject);
        },
        onerror: (): void => {
          reject(new Error("could not load the gapi library"));
        },
      });
    },
  );
};

window.onload = (): void => {
  createSandboxedIframe(
    signer,
    {
      signer: window.signerConfig,
      application: window.application,
    },
    "signer",
  )
    .then((): void => {
      // This is not a custom event, that's why it does not use the
      // helper function
      window.dispatchEvent(new Event(FRAME_CREATED_AND_LOADED));
    })
    .catch((error: any): void => {
      console.warn(error);
    });
};
