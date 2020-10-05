import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onAbandon = async (): Promise<Message | null> => {
  await GDriveApi.revokeToken();
  return {
    target: "Root",
    type: "SignedOut",
  };
};
