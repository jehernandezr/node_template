import type { DataSource } from 'typeorm';
import type { TransferBudget } from './transfer-budget.js';

/** An ongoing move within a service: the tenant, its source shard and its target shard. */
export interface TenantTransfer {
  readonly moveId: string;
  readonly tenantId: string;
  readonly source: DataSource;
  readonly target: DataSource;
  /** The call budget when several copies share it; without it, each method opens its own. */
  readonly budget?: TransferBudget;
}
