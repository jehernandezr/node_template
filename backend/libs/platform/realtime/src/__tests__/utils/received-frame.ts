/** A frame as a test client receives it. */
export interface ReceivedFrame {
  readonly id: string;
  readonly type: string;
  readonly data: unknown;
}
