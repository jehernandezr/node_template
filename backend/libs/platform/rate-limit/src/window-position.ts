/** Fixed window that an instant falls in. */
export interface WindowPosition {
  /** Number of the fixed window: `floor(now / W)`. */
  readonly index: number;
  /** Milliseconds elapsed since the start of the window, in `[0, W)`. */
  readonly elapsedMs: number;
}
