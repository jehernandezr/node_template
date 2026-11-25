/** Maintenance of the inboxes of all shards. */
export abstract class InboxMaintenance {
  /** Deletes the notifications read before `cutoff` and returns how many. */
  abstract purgeReadBefore(cutoff: Date): Promise<number>;
}
