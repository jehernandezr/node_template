/** `BatchTenantDataTransfer` settings, from the `TENANT_MOVE_*` configuration. */
export interface BatchTransferOptions {
  readonly batchSize: number;
  readonly callBudgetMs: number;
  readonly deltaMarginMs: number;
  readonly caughtUpRows: number;
}
