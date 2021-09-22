"use strict";

import {
  FRAME_GET_SPECIFIC_DATA,
  FRAME_SEND_SPECIFIC_DATA,
} from "../frames/constants";

export class FrameDataListener<T> extends Function {
  private readonly data: T;

  constructor(data: T) {
    super();
    this.data = data;
    return new Proxy(this, { apply: this._apply });
  }

  // For some reason, attempting to override apply, does not work
  public _apply = (
    target: FrameDataListener<T>,
    _: unknown,
    args: [Window, string?],
  ): Promise<boolean> | boolean => {
    return target._call(args[0], args[1]);
  };

  public _call = (
    source: Window,
    message?: string,
  ): Promise<boolean> | boolean => {
    if (message === FRAME_GET_SPECIFIC_DATA) {
      source.postMessage(
        {
          type: FRAME_SEND_SPECIFIC_DATA,
          data: this.data,
        },
        location.origin,
      );
      return true;
    }
    return false;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface FrameDataListener<T> {
  (window: Window, message?: string): Promise<boolean> | boolean;
}
