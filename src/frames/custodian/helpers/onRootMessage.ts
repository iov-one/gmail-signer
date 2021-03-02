import { Message } from "types/message";
import { RootActions } from "types/rootActions";
import { sendMessage } from "utils/sendMessage";

export const onRootMessage = (message: Message<RootActions>): void =>
  sendMessage(parent, message);
