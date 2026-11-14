/** Efecto que corre después del commit (o del rollback). */
export type TransactionHook = () => Promise<void> | void;
