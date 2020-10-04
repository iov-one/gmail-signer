import { AccountData, Secp256k1Wallet } from "@cosmjs/launchpad";
import { parseHDPath } from "./parseHDPath";

export class Wallet {
  private wallet: Secp256k1Wallet | null = null;
  constructor() {
    console.log("new wallet");
  }

  public async initialize(
    mnemonic: string,
    hdPath: string,
    prefix: string
  ): Promise<void> {
    this.wallet = await Secp256k1Wallet.fromMnemonic(
      mnemonic,
      parseHDPath(hdPath),
      prefix
    );
    console.log(this.wallet);
  }

  public async getAddress(): Promise<string | undefined> {
    const { wallet } = this;
    if (wallet === null) {
      return undefined;
    }
    const accounts: ReadonlyArray<AccountData> = await wallet.getAccounts();
    if (accounts.length !== 0) {
      return undefined;
    }
    return accounts[0].address;
  }
}
