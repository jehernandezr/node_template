/// Operations of a tasks repository, so a demo failure can target one call.
enum TasksOperation {
  /// Listing tasks.
  list,

  /// Searching tasks.
  search,

  /// Loading one task.
  get,

  /// Creating a task.
  create,

  /// Changing a task.
  update,

  /// Deleting a task.
  delete,
}
