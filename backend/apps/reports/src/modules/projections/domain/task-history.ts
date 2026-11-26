import type { Page } from '@contracts/platform';
import type { TaskChange } from '@contracts/tasks';

/** A tenant's task history according to its owner, the tasks service, by pages. */
export abstract class TaskHistory {
  /**
   * Reads a page of task changes of tasks, for the backfill.
   * @param tenantId Tenant to read.
   * @param after Cursor of the previous page.
   * @param limit Page size.
   * @returns The changes and the next cursor.
   */
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<TaskChange>>;
}
