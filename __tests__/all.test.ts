import { AttachClickHandlerOptions, gapi } from "../src/gapi";
import { Events, Signer, SignerState } from "../lib";

class AuthMock implements gapi.GoogleAuth {
  readonly currentUser: gapi.GoogleUser;

  attachClickHandler(
    button: HTMLElement,
    options: AttachClickHandlerOptions,
    success: (user: gapi.GoogleUser) => void,
    failure: (reason: string) => void,
  ): void {
    console.log("attaching click ")
  }

  public init(config: {
    client_id: string;
    scope: string;
  }): Promise<gapi.GoogleAuth> {
    console.log("initialized auth object");
    return Promise.resolve(this);
  }
}

class GoogleMock implements gapi.Google {
  public load(lib: string, options: any): void {
    console.log(`loading ${lib}`);
  }

  readonly auth2: gapi.GoogleAuth = new AuthMock();
}

declare global {
  interface Window {
    gapi: gapi.Google;
  }
}


describe("All features work", () => {
  let signer: Signer;
  let button: HTMLButtonElement;
  let state: SignerState;

  beforeAll((): void => {
    const { body } = document;
    window.gapi = new GoogleMock();
    button = document.createElement("button");
    body.appendChild(button);
  });

  const eventHandler = (newState: SignerState): void => {
    state = newState;
  };

  it("Correctly creates the signer object", (): void => {
    signer = new Signer({
      authorization: {
        path: "",
      },
    });
  });

  it("Subscribes to the events", (): void => {
    // Append it to the document
    signer.on(Events.StateChange, eventHandler);
  });

  it("Connects and attaches the button", (done: (
    error?: Error,
  ) => void): void => {
    const loadSpy = jest.spyOn(window.gapi, "load");
    signer
      .connect({
        clientID:
          "759323103801-65vnghmgg12pass7ef7f34ajjcgp57nd.apps.googleusercontent.com",
        button: button,
      })
      .then((): void => {
        signer.disconnect();
        done();
      })
      .catch((error: any): void => {
        done(error);
      });
  });
});
