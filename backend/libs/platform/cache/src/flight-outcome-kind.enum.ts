/** What the leader of a shared `CacheAside` load delivers. */
export enum FlightOutcomeKind {
  /** The serialized text, read from the cache or just loaded. */
  Raw = 'raw',
  /** The loaded value, when it could not be serialized. */
  Value = 'value',
}
