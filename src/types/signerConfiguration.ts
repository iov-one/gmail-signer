export interface TwoFactorAuthConfig {
  check: string;
  register: string;
  verify: string;
  validate: string;
  remove: string;
}

export interface SignerConfiguration {
  readonly authorization: {
    readonly path: string;
  };
  readonly googleClientID: string;
  readonly mnemonicLength: 12 | 24;
  readonly twoFactorAuthUrls?: TwoFactorAuthConfig;
}
