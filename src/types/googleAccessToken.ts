interface GoogleAccessToken {
  readonly token: string;
  readonly expiresAt: number;
  readonly type: "Bearer";
  readonly scope: string[];
  readonly state: string;
}
