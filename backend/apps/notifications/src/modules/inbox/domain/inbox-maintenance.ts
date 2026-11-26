/** Maintenance of the inboxes of all shards. */
export abstract class InboxMaintenance {
  /**
   * Deletes the notifications read before `cutoff` and returns how many.
   * @param cutoff Instant the read date must predate.
   * @returns How many were deleted.
   */
  abstract purgeReadBefore(cutoff: Date): Promise<number>;
}
