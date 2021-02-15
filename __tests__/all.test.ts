import { Events, Signer, SignerState } from "../lib";

describe("All features work", () => {
  let signer: Signer;
  let button: HTMLButtonElement;
  let state: SignerState;

  beforeAll((): void => {
    const { body } = document;

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

  it("Connects and attaches the button", async (done: (
    error?: Error,
  ) => void): Promise<void> => {
    try {
      await signer.connect({
        clientID:
          "759323103801-65vnghmgg12pass7ef7f34ajjcgp57nd.apps.googleusercontent.com",
        button: button,
      });
      done();
    } catch (error) {
      done(error);
    }
  });
});
