/** Opciones de `UseCaseRunner.run`. */
export interface UseCaseRunOptions {
  /** Con `true`, el caso de uso corre dentro de `TransactionManager.runInTransaction`. Por defecto `false`. */
  readonly transaction?: boolean;
}
