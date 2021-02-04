import { GDriveApi } from "../frames/custodian/gDriveApi";
import { Modal } from "../frames/modal";
import { SignerConfig } from "../signer";
import signer from "../templates/signer.html";
import { Application } from "../types/application";
import { GoogleAuthInfo } from "../types/gogoleAuthInfo";
import { GoogleAccessToken } from "../types/googleAccessToken";
import { Message } from "../types/message";
import { ModalEvents } from "../types/modalEvents";
import { createMessageCallback } from "../utils/createMessageCallback";
import { createSandboxedIframe } from "../utils/createSandboxedIframe";
import { sendMessage } from "../utils/sendMessage";
import { onAbandon } from "./custodian/handlers/onAbandon";
import { onAuthenticated } from "./custodian/handlers/onAuthenticated";
import { onDeleteAccount } from "./custodian/handlers/onDeleteAccount";
import { onSignOut } from "./custodian/handlers/onSignOut";
import { ChildContainer } from "./signer/childContainer";

const CHILD_CONTAINER: ChildContainer = new ChildContainer();

declare global {
  interface Window {
    accessToken: GoogleAccessToken;
    signerConfig: SignerConfig;
    application: Application;
    gapi: any /* Google API */;
  }
}

const { gapi, application } = window;

const showMnemonic = async (path: string): Promise<boolean> => {
  const modal = new Modal();
  const mnemonic = await GDriveApi.readMnemonic();
  return new Promise(
    (resolve: (value: boolean) => void, reject: (error: any) => void) => {
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
        GDriveApi.setMnemonicSafelyStored();
        resolve(true);
        modal.close();
      });
      modal.open(path, "signer::authorize-signature", 600, 400);
    },
  );
};

const handleMessage = async (message: Message): Promise<Message | null> => {
  const { data } = message;
  switch (message.type) {
    case "Authenticated":
      window.accessToken = data;
      try {
        return await onAuthenticated();
      } catch (error) {
        window.accessToken = null;
        return {
          target: "Root",
          type: "Error",
          data: error,
        };
      }
    case "ShowMnemonic":
      return {
        target: "Root",
        type: "SendShowMnemonicResult",
        data: await showMnemonic(data),
      };
    case "GetIsMnemonicSafelyStored":
      return {
        target: "Root",
        type: "SendIsMnemonicSafelyStored",
        data: await GDriveApi.isMnemonicSafelyStored(),
      };
    case "DeleteAccount":
      return onDeleteAccount();
    case "SignOut":
      return onSignOut();
    case "Abandon":
      return onAbandon();
    default:
      console.warn("unknown message: " + message.type);
  }
};

const onSignerMessage = async (message: Message): Promise<void> => {
  const { child } = CHILD_CONTAINER;
  // This message belongs to the child frame, so
  // we must redirect it
  if (child === null) {
    throw new Error("cannot forward this message, not initialized properly");
  }
  // Send as is, we don't want to use this
  return sendMessage(child.contentWindow, message);
};

const onCustodianMessage = async (message: Message): Promise<void> => {
  const { child } = CHILD_CONTAINER;
  const response: Message | null = await handleMessage(message);
  if (response !== null) {
    if (response.target === "Signer") {
      sendMessage(child.contentWindow, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    } else if (response.target === "Root") {
      sendMessage(parent, {
        ...response,
        // Overwrite the uid to let the sender know
        // this was their original message if the want
        // or need to
        uid: message.uid,
      });
    } else {
      throw new Error(
        "sorry, I don't know this target: `" + response.target + "'",
      );
    }
  }
};

const onMessage = async (message: Message): Promise<void> => {
  switch (message.target) {
    case "Custodian":
      return onCustodianMessage(message);
    case "Signer":
      return onSignerMessage(message);
    case "Root":
      return sendMessage(parent, message);
    default:
      throw new Error("unknown message type cannot be handled");
  }
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
    .then((frame: HTMLIFrameElement): void => {
      CHILD_CONTAINER.child = frame;
      // Announce initialization
      window.postMessage("", location.origin);
      // Attach the event listener
      window.addEventListener("message", createMessageCallback(onMessage));
    })
    .catch((error: any): void => {
      console.warn(error);
    });
};

const transformGooglesResponse = (user: any): GoogleAuthInfo => {
  const profile = user.getBasicProfile();
  const auth = user.getAuthResponse(true);
  return {
    accessToken: {
      token: auth.access_token,
      expiresAt: auth.expires_at,
      idToken: auth.id_token,
      type: auth.token_type,
      scope: auth.scope,
      state: undefined,
    },
    user: {
      firstName: profile.getGivenName(),
      lastName: profile.getFamilyName(),
      email: profile.getEmail(),
      picture: profile.getImageUrl(),
    },
  };
};

const main = (): void => {
  gapi.load("auth2", () => {
    const { button } = application;
    gapi.auth2
      .init({
        client_id: application.clientID,
        scope: "https://www.googleapis.com/auth/drive.appdata",
      })
      .then((auth2: any): void => {
        const currentUser = auth2.currentUser.get();
        const onSignedIn = (user: any): void => {
          document.dispatchEvent(
            new CustomEvent("auth-succeeded", {
              detail: transformGooglesResponse(user),
            }),
          );
        };
        const onFailure = (error: any): void => {
          document.dispatchEvent(
            new CustomEvent("auth-failed", {
              detail: error,
            }),
          );
        };
        const onClick = (): void => {
          document.dispatchEvent(new Event("auth-started"));
          if (currentUser.isSignedIn()) {
            onSignedIn(currentUser);
          }
        };
        if (!currentUser.isSignedIn()) {
          auth2.attachClickHandler(button, {}, onSignedIn, onFailure);
        }
        button.addEventListener("click", onClick, true);
        console.log("should be ready");
        document.dispatchEvent(new Event("auth-ready"));
      });
  });
};

main();
