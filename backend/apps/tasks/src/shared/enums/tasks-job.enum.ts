/** Jobs periódicos de tasks. */
export enum TasksJob {
  /** Elimina las tareas borradas hace más de `TASKS_DELETED_RETENTION_DAYS`. */
  PurgeDeleted = 'tasks.purge-deleted',
}
