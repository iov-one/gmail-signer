import {
  AccountData,
  makeSignBytes,
  Secp256k1Wallet,
  StdSignature,
  StdTx,
} from "@cosmjs/launchpad";
import { parseHDPath } from "./parseHDPath";

export class Wallet {
  private wallet: Secp256k1Wallet | null = null;

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
  }

  public async getAddress(): Promise<string | undefined> {
    const { wallet } = this;
    if (wallet === null) {
      return undefined;
    }
    const accounts: ReadonlyArray<AccountData> = await wallet.getAccounts();
    // Why would there be more than 1 account?
    if (accounts.length !== 1) {
      return undefined;
    }
    return accounts[0].address;
  }

  public async signTx(tx: StdTx): Promise<StdTx> {
    const { wallet } = this;
    const signBytes = makeSignBytes(tx.msg, tx.fee, "", tx.memo, 1, 1);
    const signature: StdSignature = await wallet.sign(
      await this.getAddress(),
      signBytes
    );
    return {
      ...tx,
      signatures: [signature],
    };
  }
}
