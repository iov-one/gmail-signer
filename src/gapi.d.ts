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
    getAuthResponse(includeAuthorizationData: boolean): GoogleApiAuthResponse;
    getGrantedScopes(): string;
    getId(): string;
    get(): User;
    isSignedIn(): boolean;
    hasGrantedScopes(scopes: string): boolean;
  }

  export interface gapi {
    readonly load: (mod: string, options: LoadOptions) => void;
    readonly auth2: Auth;
  }

  export interface InitConfig {
    readonly client_id: string;
    readonly scope?: string;
    readonly cookiepolicy?: "single_host_origin" | "none";
    readonly fetch_basic_profile?: boolean;
    readonly prompt?: string;
    readonly redirect_uri?: string;
    readonly ux_mode?: "popup" | "redirect";
  }

  export interface Auth {
    readonly currentUser: User;
    readonly isSignedIn: Observable<boolean>;
    disconnect(): void;
    signIn(): Promise<User>;

    init(config: InitConfig): Promise<Auth>;
    signOut(): Promise<void>;

    getAuthInstance(): Auth;
  }
}
