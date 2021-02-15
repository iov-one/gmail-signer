import {
  AccountData,
  makeSignBytes,
  Msg,
  Secp256k1Wallet,
  StdFee,
  StdSignature,
} from "@cosmjs/launchpad";
import { parseHDPath } from "frames/signer/helpers/parseHDPath";

export class Wallet {
  private wallet: Secp256k1Wallet | null = null;

  public async initialize(
    mnemonic: string,
    hdPath: string,
    prefix: string,
  ): Promise<void> {
    this.wallet = await Secp256k1Wallet.fromMnemonic(
      mnemonic,
      parseHDPath(hdPath),
      prefix,
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

  public async sign(
    messages: ReadonlyArray<Msg>,
    fee: StdFee,
    chainId: string,
    memo: string,
    accountNumber: number,
    sequence: number,
  ): Promise<StdSignature> {
    const { wallet } = this;
    const signBytes = makeSignBytes(
      messages,
      fee,
      chainId,
      memo,
      accountNumber,
      sequence,
    );
    return await wallet.sign(await this.getAddress(), signBytes);
  }
}
