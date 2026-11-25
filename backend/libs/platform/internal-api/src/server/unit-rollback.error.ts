/**
 * `TransactionManager.runInTransaction` only rolls back the unit of work
 * when the function throws, so the `UnitOfWorkRunner` throws this error to
 * roll it back and catches it itself. What was decided travels in `UnitProgress`,
 * not in the error, and it never leaves `run`.
 */
export class UnitRollbackError extends Error {
  constructor() {
    super('The unit of work was rolled back');
    this.name = 'UnitRollbackError';
  }
}
