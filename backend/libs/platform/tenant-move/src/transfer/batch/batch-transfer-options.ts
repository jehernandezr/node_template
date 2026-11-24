/** Ajustes de `BatchTenantDataTransfer`, de la configuración `TENANT_MOVE_*`. */
export interface BatchTransferOptions {
  readonly batchSize: number;
  readonly callBudgetMs: number;
  readonly deltaMarginMs: number;
  readonly caughtUpRows: number;
}
