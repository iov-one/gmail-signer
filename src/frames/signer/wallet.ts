import {
  AccountData,
  AminoSignResponse,
  Secp256k1HdWallet,
} from "@cosmjs/amino";
import { stringToPath } from "@cosmjs/crypto";
import { toBase64 } from "@cosmjs/encoding";
import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1HdWalletOptions,
  DirectSignResponse,
} from "@cosmjs/proto-signing";
import Long from "long";

import { isSignDoc, isStdSignDoc, Signable } from "../../types/signable";

export class Wallet {
  private directSigner: DirectSecp256k1HdWallet | null = null;
  private aminoSigner: Secp256k1HdWallet | null = null;
  private mnemonic: string | null = null;

  public async initialize(
    mnemonic: string,
    hdPath: string,
    prefix: string,
  ): Promise<void> {
    // We are creating 2 signers because we need to provide both versions
    // stargate and launchpad for the time being.
    this.aminoSigner = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: prefix,
      hdPaths: [stringToPath(hdPath)],
    });
    this.directSigner = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: prefix,
      hdPaths: [stringToPath(hdPath)],
    });
    this.mnemonic = mnemonic;
  }

  public async getAddress(): Promise<string | undefined> {
    const { aminoSigner } = this;
    if (aminoSigner === null) {
      return undefined;
    }
    const accounts: ReadonlyArray<AccountData> =
      await aminoSigner.getAccounts();
    // Why would there be more than 1 account?
    if (accounts.length === 0) {
      return undefined;
    }
    return accounts[0].address;
  }

  public async getPublicKey(): Promise<string | undefined> {
    const { aminoSigner } = this;
    if (aminoSigner === null) {
      return undefined;
    }
    const accounts: ReadonlyArray<AccountData> =
      await aminoSigner.getAccounts();
    // Why would there be more than 1 account?
    if (accounts.length === 0) {
      return undefined;
    }
    return toBase64(accounts[0].pubkey);
  }

  public async sign(
    signable: Signable,
  ): Promise<DirectSignResponse | AminoSignResponse> {
    const { directSigner, aminoSigner } = this;
    if (directSigner === null || aminoSigner === null) {
      throw new Error("signer not initialized");
    }
    // Sign it!!!
    const address: string | undefined = await this.getAddress();
    if (address === undefined) {
      throw new Error("cannot get the address for this wallet");
    }
    if (isSignDoc(signable)) {
      const { accountNumber } = signable;
      return directSigner.signDirect(address, {
        ...signable,
        accountNumber: new Long(
          accountNumber.low,
          accountNumber.high,
          accountNumber.unsigned,
        ),
      });
    } else if (isStdSignDoc(signable)) {
      return aminoSigner.signAmino(address, signable);
    } else {
      throw new Error("'signable' must be a SignDoc or StdSignDoc");
    }
  }

  public async getExtraAccounts(
    options: Partial<DirectSecp256k1HdWalletOptions>,
  ): Promise<ReadonlyArray<AccountData>> {
    const { mnemonic } = this;
    if (mnemonic === null) {
      throw new Error("signer not initialized");
    }
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      mnemonic,
      options,
    );

    return wallet.getAccounts();
  }
}
