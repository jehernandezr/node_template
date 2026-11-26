/** Cleanup of password recoveries in all shards. */
export abstract class PasswordResetRetention {
  /**
   * Deletes the recoveries that expired before `cutoff` and returns how many.
   * @param cutoff Instant the expiry must predate.
   * @returns How many were deleted.
   */
  abstract purgeExpiredBefore(cutoff: Date): Promise<number>;
}
