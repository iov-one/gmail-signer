export interface GenericMessage<T = undefined> {
  readonly type: string;
  readonly data: T;
}
