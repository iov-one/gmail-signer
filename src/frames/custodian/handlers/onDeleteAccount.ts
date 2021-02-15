import { GDriveApi } from "frames/custodian/gDriveApi";
import { Message } from "types/message";
import { RootActions } from "types/rootActions";

export const onDeleteAccount = async (): Promise<Message<RootActions>> => {
  await GDriveApi.deleteMnemonic();
  return {
    target: "Root",
    type: RootActions.AccountDeleted,
  };
};
