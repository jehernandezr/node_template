import type { TaskStatus } from '@contracts/tasks';

/** Campos que alguien pide cambiar; los ausentes quedan como están. */
export interface TaskChanges {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
}
