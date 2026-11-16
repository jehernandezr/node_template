/**
 * `TransactionManager.runInTransaction` solo deshace la unidad de trabajo
 * cuando la función lanza, así que el `UnitOfWorkRunner` lanza este error para
 * deshacerla y lo atrapa él mismo. Lo que se decidió viaja en `UnitProgress`,
 * no en el error, y nunca sale de `run`.
 */
export class UnitRollbackError extends Error {
  constructor() {
    super('The unit of work was rolled back');
    this.name = 'UnitRollbackError';
  }
}
