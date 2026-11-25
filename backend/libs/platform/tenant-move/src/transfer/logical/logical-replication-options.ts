/** Settings of `LogicalReplicationTransfer`, from the `TENANT_MOVE_*` configuration. */
export interface LogicalReplicationOptions {
  readonly callBudgetMs: number;
  /** Pending WAL, in bytes, below which the subscription is considered caught up. */
  readonly caughtUpBytes: number;
  /** Maximum wait for the `ALTER TABLE ... REPLICA IDENTITY` lock. */
  readonly lockTimeoutMs: number;
  /** How the target server reaches the source; by default, the address the service uses. */
  readonly sourceHost?: string;
  readonly sourcePort?: number;
}
