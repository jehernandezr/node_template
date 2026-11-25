/** Settings and hooks of a {@link Bulkhead}. */
export interface BulkheadOptions {
  /** Maximum concurrent calls. */
  readonly limit: number;
  /** Calls that can wait for a slot before being rejected. */
  readonly queue: number;
  /** Error thrown when there is no free slot or room in the queue. */
  readonly rejectWith: () => Error;
  readonly onReject?: () => void;
}
