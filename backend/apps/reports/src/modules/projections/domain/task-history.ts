import type { Page } from '@contracts/platform';
import type { TaskChange } from '@contracts/tasks';

/** A tenant's task history according to its owner, the tasks service, by pages. */
export abstract class TaskHistory {
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<TaskChange>>;
}
