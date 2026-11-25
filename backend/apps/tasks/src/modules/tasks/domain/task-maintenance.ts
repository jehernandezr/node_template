import type { UserRef } from '@contracts/platform';

/** Maintenance of the tasks of all tenants of all shards. */
export abstract class TaskMaintenance {
  /** Removes the tasks deleted before `cutoff` and returns how many. */
  abstract purgeDeletedBefore(cutoff: Date): Promise<number>;

  /** Replaces the user as author or last editor with `replacement` and returns the affected tasks. */
  abstract replaceAuthor(userId: string, replacement: UserRef): Promise<number>;
}
