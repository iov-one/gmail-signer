import { Coin, Msg, StdFee, StdSignature } from "@cosmjs/launchpad";
import { Message } from "../../../types/message";
import { ModalEvents } from "../../../types/modalEvents";
import { Modal } from "../../modal";

export const onSignTx = async (
  messages: Msg[],
  fee: StdFee,
  chainId: string,
  memo = "",
  accountNumber: number,
  sequenceNumber: number
): Promise<Message> => {
  const { wallet } = window;
  const {
    authorization: { path, elementId },
  } = window.signerConfig;
  const modal = new Modal();
  return new Promise(
    (
      resolve: (message: Message) => void,
      reject: (error: any) => void
    ): void => {
      modal.on(ModalEvents.Loaded, (document: HTMLDocument): void => {
        const element: HTMLElement | null = document.getElementById(elementId);
        console.log(element);
        if (element !== null) {
          const coin: Coin = fee.amount[0];
          const item: HTMLElement = element.querySelector(
            "span[data-key='fee']"
          );
          if (item !== null) {
            item.appendChild(
              document.createTextNode(
                (Number(coin.amount) / 1000000).toLocaleString()
              )
            );
          }
        }
      });
      modal.on(ModalEvents.Rejected, (): void => {
        modal.close();
        reject(new Error("You just rejected to sign the transaction"));
      });
      modal.on(ModalEvents.Accepted, (): void => {
        modal.close();
        wallet
          .sign(messages, fee, chainId, memo, accountNumber, sequenceNumber)
          .then((signature: StdSignature): void => {
            resolve({
              target: "Root",
              type: "SendSignedTx",
              data: signature,
            });
          });
      });
      modal.open(path, "signer::authorize-signature", 600, 400);
    }
  );
};
