/** How an attempt's timeout is enforced. */
export enum TimeoutStrategy {
  /** Aborts the signal and waits for the operation to honor it. */
  Cooperative = 'cooperative',
  /** Rejects as soon as the time expires, even if the operation keeps running. */
  Aggressive = 'aggressive',
}
