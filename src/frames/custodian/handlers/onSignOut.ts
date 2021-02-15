import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onSignOut = async (): Promise<Message<RootActions> | null> => {
  return {
    target: "Root",
    type: RootActions.SignedOut,
  };
};
