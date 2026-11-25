/** Status of a task. */
export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Done = 'done',
}

/** Task fields that a change can modify. */
export enum TaskField {
  Title = 'title',
  Description = 'description',
  Status = 'status',
}
