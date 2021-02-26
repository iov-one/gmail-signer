import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onSignOut = (): Promise<Message<RootActions> | null> => {
  return Promise.resolve({
    target: "Root",
    type: RootActions.SignedOut,
  });
};
