import { Message } from "../../../types/message";

export const onSignOut = async (): Promise<Message | null> => {
  return {
    target: "Root",
    type: "SignedOut",
  };
};
