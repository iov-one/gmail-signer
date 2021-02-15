import { Wallet } from "frames/signer/wallet";
import { SignerConfig } from "signer";
import { Application } from "type/application";
import { GoogleAccessToken } from "type/googleAccessToken";
import { GoogleApi } from "type/googleApi";

declare global {
  interface Window {
    accessToken: GoogleAccessToken;
    signerConfig: SignerConfig;
    application: Application;
    gapi: GoogleApi /* Google API */;
    wallet: Wallet;
  }
}
