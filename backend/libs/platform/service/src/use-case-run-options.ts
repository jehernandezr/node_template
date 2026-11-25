/** Options of `UseCaseRunner.run`. */
export interface UseCaseRunOptions {
  /** With `true`, the use case runs inside `TransactionManager.runInTransaction`. `false` by default. */
  readonly transaction?: boolean;
}
