import { GoogleAccessToken } from "../../../types/googleAccessToken";
import { Message } from "../../../types/message";
import { RootActions } from "../../../types/rootActions";
import { GDriveApi } from "../gDriveApi";

export const onDeleteAccount = async (
  accessToken: GoogleAccessToken,
): Promise<Message<RootActions>> => {
  await GDriveApi.deleteMnemonic(accessToken);
  return {
    target: "Root",
    type: RootActions.AccountDeleted,
  };
};
