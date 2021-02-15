export interface GoogleApiProfile {
  getGivenName(): string;
  getFamilyName(): string;
  getEmail(): string;
  getImageUrl(): string;
}

export interface GoogleApiAuthResponse {
  readonly access_token: string;
  readonly expires_at: string;
  readonly id_token: string;
  readonly token_type: "Bearer";
  readonly scope: string;
}

export interface GoogleApiUser {
  getBasicProfile(): GoogleApiProfile;
  getAuthResponse(arg: boolean): GoogleApiAuthResponse;
  get(): GoogleApiUser;
  isSignedIn(): boolean;
}

export interface AttachClickHandlerOptions {}

export interface Auth2 {
  readonly currentUser: GoogleApiUser;
  attachClickHandler(
    button: HTMLElement,
    options: AttachClickHandlerOptions,
    success: (user: GoogleApiUser) => void,
    failure: (error: Error) => void,
  ): void;
  init(config: { client_id: string; scope: string }): Promise<Auth2>;
}

export interface GoogleApi {
  load(mod: string, callback: () => void): void;
  readonly auth2: Auth2;
}
