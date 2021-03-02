import { Events, Signer, SignerState } from "../lib";

describe("All features work", () => {
  let signer: Signer;
  let state: SignerState;
  let button: HTMLButtonElement;

  const eventHandler = (newState: SignerState): void => {
    state = newState;
  };

  beforeAll((): void => {
    const { body } = document;
    button = document.createElement("button");
    // Create the signer
    signer = new Signer({
      authorization: {
        path: "",
      },
    });
    // Connect the event handler
    signer.on(Events.StateChange, eventHandler);
    // The button must be in the body of the document
    body.appendChild(button);
  });

  afterAll((): void => {
    signer.off(Events.StateChange);
  });

  it("Connects and attaches the button", async (): Promise<void> => {
    const promise: Promise<void> = signer.connect({
      clientID:
        "759323103801-65vnghmgg12pass7ef7f34ajjcgp57nd.apps.googleusercontent.com",
      button: button,
    });
    expect(state).toEqual(SignerState.Loading);
    await expect(promise).resolves.toBeUndefined();
    expect(state).toEqual(SignerState.ReadyToSignIn);
  });

  it("Contains the custodian iframe", (): void => {
    const frames: HTMLCollectionOf<HTMLIFrameElement> = document.getElementsByTagName(
      "iframe",
    );
    expect(frames).toHaveLength(1);
    expect(frames[0].id).toEqual("gdrive-custodian-custodian");
  });

  it("Disconnects and stops listening", (): void => {
    signer.signOut();
  });
});
