import { Wallet } from "frames/signer/wallet";
import { gapi } from "gapi";
import { SignerConfig } from "signer";
import { Application } from "types/application";
import { GoogleAccessToken } from "types/googleAccessToken";

declare global {
  interface Window {
    accessToken: GoogleAccessToken;
    signerConfig: SignerConfig;
    application: Application;
    wallet: Wallet;
    gapi: gapi.Google;
    initialize?(): Promise<void>;
  }
}
