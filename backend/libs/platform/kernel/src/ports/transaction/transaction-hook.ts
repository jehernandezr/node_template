/** Effect that runs after the commit (or the rollback). */
export type TransactionHook = () => Promise<void> | void;
