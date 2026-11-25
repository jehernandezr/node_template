/** Store with finished records that a retention task deletes. */
export abstract class PurgeableStore {
  /** Deletes what finished before `before`. Returns how many records it removed. */
  abstract purgeCompleted(before: Date): Promise<number>;
}
