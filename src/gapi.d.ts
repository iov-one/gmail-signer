export interface GoogleApiAuthResponse {
  readonly access_token: string;
  readonly expires_at: string;
  readonly id_token: string;
  readonly token_type: "Bearer";
  readonly scope: string;
}

export interface AttachClickHandlerOptions {}

declare namespace gapi {
  type LoadOptionsCallback = () => void;
  interface LoadOptionsOption {
    readonly callback: LoadOptionsCallback;
    readonly onerror: (reason: string) => void;
  }
  type LoadOptions = LoadOptionsCallback | LoadOptionsOption;

  export interface BasicProfile {
    getGivenName(): string;
    getFamilyName(): string;
    getEmail(): string;
    getImageUrl(): string;
  }

  export interface GoogleUser {
    getBasicProfile(): BasicProfile;
    getAuthResponse(arg: boolean): GoogleApiAuthResponse;
    get(): GoogleUser;
    isSignedIn(): boolean;
  }

  export interface Google {
    readonly load: (mod: string, options: LoadOptions) => void;
    readonly auth2: GoogleAuth;
  }

  export interface GoogleAuth {
    readonly currentUser: GoogleUser;

    attachClickHandler(
      button: HTMLElement,
      options: AttachClickHandlerOptions,
      success: (user: GoogleUser) => void,
      failure: (reason: string) => void,
    ): void;

    init(config: { client_id: string; scope: string }): Promise<GoogleAuth>;
  }
}
