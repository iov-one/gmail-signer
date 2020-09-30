import { Secp256k1Wallet } from "@cosmjs/launchpad";

export class WalletContainer {
  private wallet: Secp256k1Wallet | null = null;

  public async createWallet(mnemonic: string): Promise<void> {
    this.wallet = await Secp256k1Wallet.fromMnemonic(mnemonic);
  }
}
