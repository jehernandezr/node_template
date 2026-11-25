/** Cleanup of password recoveries in all shards. */
export abstract class PasswordResetRetention {
  /** Deletes the recoveries that expired before `cutoff` and returns how many. */
  abstract purgeExpiredBefore(cutoff: Date): Promise<number>;
}
