import { Message } from "types/message";
import { SignerActions } from "types/signerActions";
import { sendMessage } from "utils/sendMessage";

export const onSignerMessage = (message: Message<SignerActions>): void => {
  if (frames.length === 0) {
    throw new Error("cannot forward this message, not initialized properly");
  }
  // Send as is, we don't want to use this
  return sendMessage(frames[0], message);
};
