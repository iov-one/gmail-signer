export interface AuthEventDetail<T = undefined> {
  readonly type: string;
  readonly data?: T;
}
