import "3rdParty/gapi";

import {
  CUSTODIAN_AUTH_CONNECT_GAPI_EVENT,
  CUSTODIAN_AUTH_EVENT,
  CUSTODIAN_AUTH_FAILED_EVENT,
  CUSTODIAN_AUTH_READY_EVENT,
  CUSTODIAN_AUTH_STARTED_EVENT,
  CUSTODIAN_AUTH_SUCCEEDED_EVENT,
  FRAME_CREATED_AND_LOADED,
} from "frames/constants";
import { GDriveApi } from "frames/custodian/gDriveApi";
import { onAbandon } from "frames/custodian/handlers/onAbandon";
import { onAuthenticated } from "frames/custodian/handlers/onAuthenticated";
import { onDeleteAccount } from "frames/custodian/handlers/onDeleteAccount";
import { onSignOut } from "frames/custodian/handlers/onSignOut";
import { Modal } from "modal";
import signer from "templates/signer.html";
import { AuthEventDetail } from "type/authEventDetail";
import { Auth2, GoogleApi, GoogleApiUser } from "type/googleApi";
import { ActionType } from "types/actionType";
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
import { ModalEvents } from "types/modalEvents";
import { RootActions } from "types/rootActions";
import { SignerActions } from "types/signerActions";
import { createMessageCallback } from "utils/createMessageCallback";
import { createSandboxedIframe } from "utils/createSandboxedIframe";
import { sendMessage } from "utils/sendMessage";

const showMnemonic = async (path: string): Promise<boolean> => {
  const modal = new Modal();
  const mnemonic = await GDriveApi.readMnemonic();
  return new Promise(
    (resolve: (value: boolean) => void, reject: (error: Error) => void) => {
      modal.on(ModalEvents.Loaded, (document: HTMLDocument): void => {
        const items: NodeListOf<Element> = document.querySelectorAll(
          "[data-key]",
        );
        const words = mnemonic.split(/\s+/);
        items.forEach((item: Element): void => {
          const key: string = item.getAttribute("data-key");
          if (key.startsWith("word-")) {
            const index = Number(key.replace("word-", ""));
            item.appendChild(document.createTextNode(words[index]));
            item.removeAttribute("data-key");
          }
        });
      });
      modal.on(ModalEvents.Rejected, (): void => {
        resolve(false);
        modal.close();
      });
      modal.on(ModalEvents.Accepted, (): void => {
        GDriveApi.setMnemonicSafelyStored()
          .then((): void => {
            resolve(true);
          })
          .catch((): void => {
            reject(
              new Error(
                "an error has occurred when attempting to call a google api",
              ),
            );
          })
          .finally((): void => {
            modal.close();
          });
      });
      modal.open(path, "signer::authorize-signature", 600, 400);
    },
  );
};

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

const transformGooglesResponse = (user: GoogleApiUser): GoogleAuthInfo => {
  const profile = user.getBasicProfile();
  const auth = user.getAuthResponse(true);
  const { scope } = auth;
  return {
    accessToken: {
      token: auth.access_token,
      expiresAt: Number(auth.expires_at),
      idToken: auth.id_token,
      type: auth.token_type,
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

const gapi = window.gapi as GoogleApi;

const onAuth2Initialized = (auth2: Auth2): void => {
  const { application } = window;
  const { button } = application;
  const currentUser = auth2.currentUser.get();
  const onSignedIn = (user: GoogleApiUser): void => {
    window.dispatchEvent(
      new CustomEvent<AuthEventDetail<GoogleAuthInfo>>(CUSTODIAN_AUTH_EVENT, {
        detail: {
          type: CUSTODIAN_AUTH_SUCCEEDED_EVENT,
          data: transformGooglesResponse(user),
        },
      }),
    );
  };
  const onFailure = (error: Error): void => {
    window.dispatchEvent(
      new CustomEvent<AuthEventDetail<Error>>(CUSTODIAN_AUTH_EVENT, {
        detail: {
          type: CUSTODIAN_AUTH_FAILED_EVENT,
          data: error,
        },
      }),
    );
  };
  const onClick = (): void => {
    window.dispatchEvent(
      new CustomEvent<AuthEventDetail>(CUSTODIAN_AUTH_EVENT, {
        detail: {
          type: CUSTODIAN_AUTH_STARTED_EVENT,
        },
      }),
    );
    if (currentUser.isSignedIn()) {
      onSignedIn(currentUser);
    }
  };
  if (!currentUser.isSignedIn()) {
    auth2.attachClickHandler(button, {}, onSignedIn, onFailure);
  }
  button.addEventListener("click", onClick, true);
  // Now we are ready for the button to be clicked
  window.dispatchEvent(
    new CustomEvent<AuthEventDetail>(CUSTODIAN_AUTH_EVENT, {
      detail: {
        type: CUSTODIAN_AUTH_READY_EVENT,
      },
    }),
  );
  // Attach the event listener
  window.addEventListener("message", createMessageCallback(onMessage));
};

const setupSignInButton = (): void => {
  const { application } = window;
  const config = {
    client_id: application.clientID,
    scope: "https://www.googleapis.com/auth/drive.appdata",
  };
  gapi.auth2
    .init(config)
    .then(onAuth2Initialized)
    .catch((): void => {
      window.dispatchEvent(
        new CustomEvent<Error>(CUSTODIAN_AUTH_FAILED_EVENT, {
          detail: new Error("failed to initialize the google auth2 library"),
        }),
      );
    });
};

const onConnectGApi = (): void => {
  window.removeEventListener(CUSTODIAN_AUTH_CONNECT_GAPI_EVENT, onConnectGApi);
  // Initialize google auth api
  gapi.load("auth2", setupSignInButton);
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
      // Announce initialization
      window.dispatchEvent(new Event(FRAME_CREATED_AND_LOADED));
      // When the signer object is ready to listen to our messages
      // it will let us know
      window.addEventListener(CUSTODIAN_AUTH_CONNECT_GAPI_EVENT, onConnectGApi);
    })
    .catch((error: any): void => {
      console.warn(error);
    });
};
