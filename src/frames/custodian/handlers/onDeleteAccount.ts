import { Message } from "../../../types/message";
import { GDriveApi } from "../gDriveApi";

export const onDeleteAccount = async (): Promise<Message> => {
  await GDriveApi.deleteMnemonic();
  return {
    target: "Root",
    type: "AccountDeleted",
  };
};
