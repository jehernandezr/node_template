import type { UserRef } from '@contracts/platform';

/** Maintenance of the tasks of all tenants of all shards. */
export abstract class TaskMaintenance {
  /**
   * Removes the tasks deleted before `cutoff` and returns how many.
   * @param cutoff Instant the deletion must predate.
   * @returns How many tasks were purged.
   */
  abstract purgeDeletedBefore(cutoff: Date): Promise<number>;

  /**
   * Replaces the user as author or last editor with `replacement` and returns the affected tasks.
   * @param userId User to replace.
   * @param replacement Anonymous user that takes its place.
   * @returns How many tasks changed.
   */
  abstract replaceAuthor(userId: string, replacement: UserRef): Promise<number>;
}
