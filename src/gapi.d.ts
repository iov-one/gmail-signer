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

  export interface Error {
    readonly error: string;
  }

  interface Observable<T> {
    readonly listen: (callback: (value: T) => void) => void;
  }

  export interface User extends Observable<User> {
    getBasicProfile(): BasicProfile;
    getAuthResponse(arg: boolean): GoogleApiAuthResponse;
    get(): User;
    isSignedIn(): boolean;
  }

  export interface gapi {
    readonly load: (mod: string, options: LoadOptions) => void;
    readonly auth2: Auth;
  }

  export interface Auth {
    readonly currentUser: User;
    readonly isSignedIn: Observable<boolean>;
    signIn(): Promise<User>;

    init(config: { client_id: string; scope: string }): Promise<Auth>;
  }
}
