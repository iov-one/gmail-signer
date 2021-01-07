import {
  Coin,
  isMsgSend,
  Msg,
  MsgSend,
  StdFee,
  StdSignature,
  StdTx,
} from "@cosmjs/launchpad";

import { Message } from "../../../types/message";
import { ModalEvents } from "../../../types/modalEvents";
import { Modal } from "../../modal";

const ONE_MILLION = 1000000.0;

const Formatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
  useGrouping: true,
});

const getFeeValue = (fee: StdFee): number => {
  if (fee.amount === undefined) return 0 /* Should probably throw */;
  const coin: Coin = fee.amount[0];
  if (coin === undefined) return 0;
  const numeric = Number(coin.amount);
  if (isNaN(numeric) === true || numeric === 0) return 0;
  return numeric / ONE_MILLION;
};

const getAmountFromMsg = (message: MsgSend): number => {
  const { amount } = message.value;
  return amount.reduce((total: number, coin: Coin): number => {
    return total + Number(coin.amount) / ONE_MILLION;
  }, 0);
};

const getTotalAmount = (messages: ReadonlyArray<Msg>): number => {
  return messages.reduce((sum: number, message: Msg): number => {
    if (isMsgSend(message)) {
      return sum + getAmountFromMsg(message);
    } else {
      return sum;
    }
  }, 0);
};

const buildRecipientsList = (
  root: Element,
  messages: ReadonlyArray<Msg>,
): HTMLElement => {
  const template: Element | null = root.firstElementChild;
  if (template === null) return document.createElement("div");
  return messages.reduce((list: HTMLElement, message: Msg): HTMLElement => {
    if (!isMsgSend(message)) return list;
    const { value } = message;
    const amountValue: number = getAmountFromMsg(message);
    const item: HTMLElement = template.cloneNode(true) as HTMLElement;
    const recipient: HTMLElement | null = item.querySelector(
      '[data-key="entry-recipient"]',
    );
    if (recipient !== null) {
      recipient.appendChild(document.createTextNode(value.to_address));
    }
    const amount: HTMLDivElement | null = item.querySelector(
      '[data-key="entry-amount"]',
    );
    if (amount !== null) {
      // Fill with the appropriate values
      amount.appendChild(
        document.createTextNode(Formatter.format(amountValue)),
      );
    }
    // Add current item to the list
    list.appendChild(item);
    // Return the initial list object
    return list;
  }, document.createElement("div"));
};

const toTransaction = (
  messages: ReadonlyArray<Msg>,
  fee: StdFee,
  memo: string,
  chainId: string,
  accountNumber: number,
  sequence: number,
): any => {
  return {
    account_number: accountNumber,
    chain_id: chainId,
    msg: messages,
    fee: fee,
    memo: memo,
    sequence: sequence,
  };
};

export const onSignTx = async (
  messages: ReadonlyArray<Msg>,
  fee: StdFee,
  chainId: string,
  memo = "",
  accountNumber: number,
  sequenceNumber: number,
): Promise<Message> => {
  const { wallet } = window;
  const {
    authorization: { path },
  } = window.signerConfig;
  const modal = new Modal();
  return new Promise(
    (
      resolve: (message: Message) => void,
      reject: (error: any) => void,
    ): void => {
      if (messages.some(isMsgSend)) {
        modal.on(ModalEvents.Loaded, (document: HTMLDocument): void => {
          const items: NodeListOf<Element> = document.querySelectorAll(
            "[data-key]",
          );
          items.forEach((item: Element): void => {
            switch (item.getAttribute("data-key")) {
              case "fee":
                item.appendChild(
                  document.createTextNode(Formatter.format(getFeeValue(fee))),
                );
                break;
              case "total":
                item.appendChild(
                  document.createTextNode(
                    Formatter.format(
                      getTotalAmount(messages) + getFeeValue(fee),
                    ),
                  ),
                );
                break;
              case "sum":
                item.appendChild(
                  document.createTextNode(
                    Formatter.format(getTotalAmount(messages)),
                  ),
                );
                break;
              case "entries":
                item.replaceChild(
                  buildRecipientsList(item, messages),
                  item.firstElementChild,
                );
                break;
              case "transaction":
                item.appendChild(
                  document.createTextNode(
                    JSON.stringify(
                      toTransaction(
                        messages,
                        fee,
                        memo,
                        chainId,
                        accountNumber,
                        sequenceNumber,
                      ),
                      null,
                      " ",
                    ),
                  ),
                );
                break;
            }
          });
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
      } else {
        wallet
          .sign(messages, fee, chainId, memo, accountNumber, sequenceNumber)
          .then((signature: StdSignature): void => {
            resolve({
              target: "Root",
              type: "SendSignedTx",
              data: signature,
            });
          });
      }
    },
  );
};
