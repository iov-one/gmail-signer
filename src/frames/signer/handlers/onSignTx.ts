import { Coin, isMsgSend, Msg, MsgSend, StdFee } from "@cosmjs/launchpad";
import { Wallet } from "frames/signer/wallet";
import { Modal } from "modal";
import { ErrorActions } from "types/errorActions";
import { Message } from "types/message";
import { ModalEvents } from "types/modalEvents";
import { RootActions } from "types/rootActions";
import { SignResponse } from "types/signable";
import { SignRequest } from "types/signRequest";

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
  if (isNaN(numeric) || numeric === 0) return 0;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isAuthorized = (
  authorizationPath: string | null,
  messages: ReadonlyArray<Msg>,
  fee: StdFee,
  chainId: string,
  memo = "",
  accountNumber: number,
  sequenceNumber: number,
): Promise<boolean> => {
  const modal = new Modal();
  return new Promise((resolve: (value: boolean) => void): void => {
    modal.on(ModalEvents.Loaded, (document: Document): void => {
      const items: NodeListOf<Element> =
        document.querySelectorAll("[data-key]");
      items.forEach((item: Element): void => {
        const childNode: Node | null = item.firstElementChild;
        switch (item.getAttribute("data-key")) {
          case "fee":
            item.appendChild(
              document.createTextNode(Formatter.format(getFeeValue(fee))),
            );
            break;
          case "total":
            item.appendChild(
              document.createTextNode(
                Formatter.format(getTotalAmount(messages) + getFeeValue(fee)),
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
            if (childNode !== null) {
              item.replaceChild(buildRecipientsList(item, messages), childNode);
            }
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
      resolve(false);
    });
    modal.on(ModalEvents.Accepted, (): void => {
      modal.close();
      resolve(true);
    });
    if (authorizationPath !== null) {
      modal.open(authorizationPath, "signer::authorize-signature", 600, 400);
    } else {
      console.warn("cannot open the authorization modal");
    }
  });
};

export const onSignTx = async (
  wallet: Wallet,
  request: SignRequest,
): Promise<
  Message<RootActions, SignResponse> | Message<ErrorActions, Error>
> => {
  const sign = async (): Promise<
    Message<RootActions, SignResponse> | Message<ErrorActions, Error>
  > => {
    try {
      const signature = await wallet.sign(request.signable);
      return {
        target: "Root",
        type: RootActions.SendSignature,
        data: signature,
      };
    } catch (error) {
      return {
        target: "Root",
        type: ErrorActions.Forwarded,
        data: error as Error,
      };
    }
  };
  // FIXME: For the moment it is not possible to easily check whether the
  //        transactions is a send or not. So we skip this check.
  //        Otherwise we should check and then call `isAuthorized()` and
  //        confirm that the user does authorize the transaction.
  return sign();
};
