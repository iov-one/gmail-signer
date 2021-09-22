import { Modal } from "../../../modal";
import { GoogleAccessToken } from "../../../types/googleAccessToken";
import { ModalEvents } from "../../../types/modalEvents";
import { GDriveApi } from "../gDriveApi";

export const showMnemonic = async (
  accessToken: GoogleAccessToken,
  path: string,
): Promise<boolean> => {
  const modal = new Modal();
  const mnemonic = await GDriveApi.readMnemonic(accessToken);
  return new Promise(
    (resolve: (value: boolean) => void, reject: (error: Error) => void) => {
      modal.on(ModalEvents.Loaded, (document: HTMLDocument): void => {
        const items: NodeListOf<Element> =
          document.querySelectorAll("[data-key]");
        const words = mnemonic.split(/\s+/);
        items.forEach((item: Element): void => {
          const key: string | null = item.getAttribute("data-key");
          if (key === null) {
            console.warn(
              "Ignoring html element without data-key property: ",
              item,
            );
          } else if (key.startsWith("word-")) {
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
        GDriveApi.setMnemonicSafelyStored(accessToken)
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
      modal.open(path, "signer::authorize-signature", 600, 500);
    },
  );
};
