/** Códigos de error del servicio tasks. */
export enum TasksErrorCode {
  TaskNotFound = 'TASKS.TASK.NOT_FOUND',
  TaskVersionConflict = 'TASKS.TASK.VERSION_CONFLICT',
  SearchQueryTooShort = 'TASKS.SEARCH.QUERY_TOO_SHORT',
}

/** Identificadores de las rutas públicas de tasks. */
export enum TasksRoute {
  ListTasks = 'tasks.task.list',
  GetTask = 'tasks.task.get',
  CreateTask = 'tasks.task.create',
  UpdateTask = 'tasks.task.update',
  DeleteTask = 'tasks.task.delete',
}

/** Identificadores de las operaciones internas de tasks. */
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

/** Tipos CloudEvents de los eventos que publica tasks. */
export enum TasksEvent {
  TaskCreated = 'tasks.task.created.v1',
  TaskUpdated = 'tasks.task.updated.v1',
  TaskDeleted = 'tasks.task.deleted.v1',
}

/** Tópicos donde tasks publica sus eventos. */
export enum TasksTopic {
  Events = 'tasks-events',
}
