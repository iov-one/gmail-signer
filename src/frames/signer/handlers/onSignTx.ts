import { Coin, Msg, StdFee, StdSignature } from "@cosmjs/launchpad";
import { Message } from "../../../types/message";
import { ModalEvents } from "../../../types/modalEvents";
import { Modal } from "../../modal";

const ONE_MILLION = 1000000;

const getFeeValue = (fee: StdFee): string => {
  if (fee.amount === undefined) return null;
  const coin: Coin = fee.amount[0];
  if (coin === undefined) return (0).toLocaleString();
  const numeric = Number(coin.amount);
  if (isNaN(numeric) === true || numeric === 0) return (0).toLocaleString();
  const value: number = numeric / ONE_MILLION;
  // Convert to appropriately formatted string
  return value.toLocaleString();
};

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
        if (element !== null) {
          const feeValue: string = getFeeValue(fee);

          const item: HTMLElement = element.querySelector(
            "span[data-key='fee']"
          );
          if (item !== null) {
            item.appendChild(document.createTextNode(feeValue));
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
