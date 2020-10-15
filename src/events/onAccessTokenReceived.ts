import { GOOGLE_ACCESS_TOKEN_STORAGE_PATH } from "../constants";
import { GoogleAccessToken } from "../types/googleAccessToken";
import { sendMessage } from "../utils/sendMessage";

export const onAccessTokenReceived = (
  signerWindow: Window,
  accessToken: GoogleAccessToken
): void => {
  // Save it if it's not saved or update it anyway

  if (signerWindow !== null) {
    sendMessage(signerWindow, {
      target: "Custodian",
      type: "Authenticated",
      data: accessToken,
    });
  } else {
    throw new Error("the sandbox frame is not ready yet");
  }
};
