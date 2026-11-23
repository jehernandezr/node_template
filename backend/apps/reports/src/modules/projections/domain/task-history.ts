import type { Page } from '@contracts/platform';
import type { TaskChange } from '@contracts/tasks';

/** La historia de tareas de un tenant según su dueño, el servicio tasks, por páginas. */
export abstract class TaskHistory {
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<TaskChange>>;
}
