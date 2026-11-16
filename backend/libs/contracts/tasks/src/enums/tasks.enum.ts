/** Estado de una tarea. */
export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Done = 'done',
}

/** Campos de una tarea que un cambio puede modificar. */
export enum TaskField {
  Title = 'title',
  Description = 'description',
  Status = 'status',
}
