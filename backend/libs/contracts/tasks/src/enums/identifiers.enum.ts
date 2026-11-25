/** Error codes of the tasks service. */
export enum TasksErrorCode {
  TaskNotFound = 'TASKS.TASK.NOT_FOUND',
  TaskVersionConflict = 'TASKS.TASK.VERSION_CONFLICT',
  SearchQueryTooShort = 'TASKS.SEARCH.QUERY_TOO_SHORT',
}

/** Identifiers of the public routes of tasks. */
export enum TasksRoute {
  ListTasks = 'tasks.task.list',
  GetTask = 'tasks.task.get',
  CreateTask = 'tasks.task.create',
  UpdateTask = 'tasks.task.update',
  DeleteTask = 'tasks.task.delete',
}

/** Identifiers of the internal operations of tasks. */
export enum TasksOperation {
  ListChanges = 'tasks.tasks.list-changes.v1',
  EraseUserData = 'tasks.user-data.erase.v1',
  TenantMoveSync = 'tasks.tenant-move.sync.v1',
  TenantMoveFinalize = 'tasks.tenant-move.finalize.v1',
  TenantMoveAbort = 'tasks.tenant-move.abort.v1',
  TenantMoveSwitch = 'tasks.tenant-move.switch.v1',
  TenantMoveCleanup = 'tasks.tenant-move.cleanup.v1',
  TenantDirectoryPlace = 'tasks.tenant-directory.place.v1',
  TenantDirectoryRemove = 'tasks.tenant-directory.remove.v1',
}

/** CloudEvents types of the events tasks publishes. */
export enum TasksEvent {
  TaskCreated = 'tasks.task.created.v1',
  TaskUpdated = 'tasks.task.updated.v1',
  TaskDeleted = 'tasks.task.deleted.v1',
}

/** Topics where tasks publishes its events. */
export enum TasksTopic {
  Events = 'tasks-events',
}
