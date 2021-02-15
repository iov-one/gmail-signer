import { GDriveApi } from "frames/custodian/gDriveApi";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onAbandon = async (): Promise<Message<RootActions> | null> => {
  await GDriveApi.revokeToken();
  return {
    target: "Root",
    type: RootActions.SignedOut,
  };
};
