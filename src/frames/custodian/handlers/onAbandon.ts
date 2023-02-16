import { GoogleAccessToken } from "../../../types/googleAccessToken";
import { Message } from "../../../types/message";
import { RootActions } from "../../../types/rootActions";
import { GDriveApi } from "../gDriveApi";

export const onAbandon = async (
  accessToken: GoogleAccessToken,
): Promise<Message<RootActions> | null> => {
  await GDriveApi.revokeToken(accessToken);
  return {
    target: "Root",
    type: RootActions.SignedOut,
  };
};
