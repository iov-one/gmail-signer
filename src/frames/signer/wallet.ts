import {
  AccountData,
  AminoSignResponse,
  Secp256k1HdWallet,
} from "@cosmjs/launchpad";
import {
  DirectSecp256k1HdWallet,
  DirectSignResponse,
} from "@cosmjs/proto-signing";
import { parseHDPath } from "frames/signer/helpers/parseHDPath";
import { isSignDoc, isStdSignDoc, Signable } from "types/signable";

export class Wallet {
  private directSigner: DirectSecp256k1HdWallet | null = null;
  private aminoSigner: Secp256k1HdWallet | null = null;

  public async initialize(
    mnemonic: string,
    hdPath: string,
    prefix: string,
  ): Promise<void> {
    // We are creating 2 signers because we need to provide both versions
    // stargate and launchpad for the time being.
    this.aminoSigner = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: prefix,
      hdPaths: [parseHDPath(hdPath)],
    });
    this.directSigner = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: prefix,
      hdPaths: [parseHDPath(hdPath)],
    });
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

  public async sign(
    signable: Signable,
  ): Promise<DirectSignResponse | AminoSignResponse> {
    const { directSigner, aminoSigner } = this;
    if (directSigner === null || aminoSigner === null)
      throw new Error("signer not initialized");
    // Sign it!!!
    const address: string | undefined = await this.getAddress();
    if (address === undefined) {
      throw new Error("cannot get the address for this wallet");
    }
    if (isSignDoc(signable)) {
      return directSigner.signDirect(address, signable);
    } else if (isStdSignDoc(signable)) {
      return aminoSigner.signAmino(address, signable);
    } else {
      throw new Error("'signable' must be a SignDoc or StdSignDoc");
    }
  }
}
