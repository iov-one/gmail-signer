import { Message } from "../../types/message";
import { sendMessage } from "../../utils/sendMessage";
import { GOOGLE_ACCESS_TOKEN_STORAGE_PATH } from "../constants";
import { signerBox } from "../signerBox";

export const onAccessTokenReceived = (accessToken: GoogleAccessToken): void => {
  // Save it if it's not saved or update it anyway
  localStorage.setItem(
    GOOGLE_ACCESS_TOKEN_STORAGE_PATH,
    JSON.stringify(accessToken)
  );
  // Send it to the Auth frame
  const message: Message = {
    target: "Custodian",
    type: "Authenticated",
    data: accessToken,
  };
  if (signerBox.signerWindow !== null) {
    // Create a new event listener for sandboxed children
    // messages
    // Now sed the access token to the Custodian
    sendMessage(
      signerBox.signerWindow,
      message,
      location.origin
    );
  } else {
    throw new Error("The signer iframe hasn't been created yet");
  }
};
