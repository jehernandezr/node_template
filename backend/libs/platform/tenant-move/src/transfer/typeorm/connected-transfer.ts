import type { DataSource } from 'typeorm';
import type { TransferBudget } from '../transfer-budget.js';

/** A move with the connections of its two shards open, as the copy adapters work with it. */
export interface ConnectedTransfer {
  readonly moveId: string;
  readonly tenantId: string;
  readonly source: DataSource;
  readonly target: DataSource;
  readonly budget?: TransferBudget;
}
