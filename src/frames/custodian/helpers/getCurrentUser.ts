import { gapi } from "../../../gapi";

export const getCurrentUser = (auth2: gapi.Auth): gapi.User => {
  const { currentUser } = auth2;
  return currentUser.get();
};
