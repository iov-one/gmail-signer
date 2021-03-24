import { gapi } from "gapi";

declare global {
  interface Window {
    gapi: gapi.gapi;
  }
}
