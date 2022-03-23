export enum RootActions {
  SendAddress = "SEND_ADDRESS",
  SendPublicKey = "SEND_PUBLIC_KEY",
  SendSignature = "SEND_SIGNATURE",
  SignerReady = "SIGNER_READY",
  AccountDeleted = "ACCOUNT_DELETED",
  SendShowMnemonicResult = "SHOW_MNEMONIC_RESULT",
  SendIsMnemonicSafelyStored = "SEND_IS_MNEMONIC_SAFELY_STORED",
  Send2faAuthResult = "SEND_2FA_AUTH_RESULT",
  Send2faResult = "SEND_2FA_RESULT",
  SignedOut = "SIGNED_OUT",
  Sandboxed = "SANDBOXED",
  ForwardedError = "FORWARDED_ERROR",
}
