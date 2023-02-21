// Custodian events
export const CUSTODIAN_AUTH_EVENT = "authEvent";

export const CUSTODIAN_AUTH_STARTED_EVENT = "authStarted";
export const CUSTODIAN_AUTH_COMPLETED_EVENT = "authCompleted";
export const CUSTODIAN_AUTH_2FA_STARTED_EVENT = "auth2faStarted";
export const CUSTODIAN_AUTH_2FA_COMPLETED_EVENT = "auth2faCompleted";
export const CUSTODIAN_AUTH_2FA_FAILED_ATTEMPT_EVENT = "auth2faFailedAttempt";
export const CUSTODIAN_AUTH_2FA_CONFIG_FAILURE = "auth2faConfigFailure";
export const CUSTODIAN_AUTH_2FA_AUTHENTICATED_CUSTOM_EVENT =
  "2faUserAuthenticated";

export const CUSTODIAN_BASIC_AUTH_FAILED_EVENT = "authBasicFailed";
export const CUSTODIAN_BASIC_AUTH_SUCCEEDED_EVENT = "authBasicSucceeded";
export const CUSTODIAN_AUTH_READY_EVENT = "authReady";
// Custodian requests
export const CUSTODIAN_SIGN_IN_REQUEST = "custodianSignInRequest";

// Frame stuff
export const FRAME_CREATED_AND_LOADED = "createdAndLoaded";
export const FRAME_GET_SPECIFIC_DATA = "getSpecificData";
export const FRAME_SEND_SPECIFIC_DATA = "sendSpecificData";
