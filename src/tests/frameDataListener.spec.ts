import { FRAME_GET_SPECIFIC_DATA } from "frames/constants";
import { FrameDataListener } from "types/frameDataListener";

describe("Temporary listener objects are callable", (): void => {
  test("Create a frame data listener and call it", async (): Promise<void> => {
    const listener = new FrameDataListener("Example Data");
    window.postMessage = (message: any, targetOrigin: string): void => {
      console.log(message);
    };
    const result = await listener(window, FRAME_GET_SPECIFIC_DATA);
    expect(result).toBe(true);
  });
});
