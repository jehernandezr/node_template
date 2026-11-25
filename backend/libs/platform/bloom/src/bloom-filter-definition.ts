/**
 * Declaration of a named filter: how much fits, how wrong it can be and when it is rebuilt.
 * @typeParam TName caller's enum of filter names, as a string.
 */
export interface BloomFilterDefinition<TName extends string = string> {
  readonly name: TName;
  /** Items the filter is sized for. Beyond them, the false positive rate grows. */
  readonly expectedItems: number;
  /** Target false positive rate. Defaults to `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * Cron expression (five fields, or six with seconds, in UTC) of the job that rebuilds the filter from its
   * source of truth. A filter does not forget items, so the rebuild is what discards removed ones
   * and resets a filter that grew beyond `expectedItems`.
   */
  readonly rebuildCron: string;
}

/** A definition with its default value applied and its values verified. */
export interface ResolvedBloomFilterDefinition<
  TName extends string = string,
> extends BloomFilterDefinition<TName> {
  readonly falsePositiveRate: number;
}
