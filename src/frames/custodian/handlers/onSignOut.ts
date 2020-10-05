import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onSignOut = async (): Promise<Message | null> => {
  await GDriveApi.revokeToken();
  return {
    target: "Root",
    type: "SignedOut",
  };
};
