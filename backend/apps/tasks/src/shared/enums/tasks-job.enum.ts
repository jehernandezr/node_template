/** tasks periodic jobs. */
export enum TasksJob {
  /** Permanently removes the tasks deleted more than `TASKS_DELETED_RETENTION_DAYS` ago. */
  PurgeDeleted = 'tasks.purge-deleted',
}
