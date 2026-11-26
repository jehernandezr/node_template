import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { Clock } from '@platform/kernel';
import type { ShardLocation } from '@platform/persistence';
import { TenantDataTransfer } from './tenant-data-transfer.js';
import type { TenantTransfer } from './tenant-transfer.js';
import { TransferBudget } from './transfer-budget.js';

/**
 * Several copies of the same move over different tables, one after another: logical replication for the service
 * tables and batch copy for the platform tables, which replication cannot filter by tenant. All
 * parts of a call spend the same budget, so the call never lasts longer than `callBudgetMs`.
 */
export class CompositeTenantDataTransfer extends TenantDataTransfer {
  constructor(
    private readonly parts: readonly TenantDataTransfer[],
    private readonly clock: Clock,
    private readonly callBudgetMs: number,
  ) {
    super();
  }

  async sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    const shared = this.withBudget(transfer);
    const progress: TenantMoveProgress[] = [];
    for (const part of this.parts) {
      progress.push(await part.sync(shared));
    }
    return {
      tables: progress.flatMap((entry) => entry.tables),
      caughtUp: progress.every((entry) => entry.caughtUp),
    };
  }

  async verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    const shared = this.withBudget(transfer);
    const checks: TenantMoveVerification[] = [];
    for (const part of this.parts) {
      checks.push(await part.verify(shared));
    }
    return {
      tables: checks.flatMap((entry) => entry.tables),
      verified: checks.every((entry) => entry.verified),
    };
  }

  async abort(transfer: TenantTransfer): Promise<void> {
    const shared = this.withBudget(transfer);
    for (const part of this.parts) {
      await part.abort(shared);
    }
  }

  async cleanup(
    tenantId: string,
    source: ShardLocation,
    budget: TransferBudget = this.newBudget(),
  ): Promise<void> {
    for (const part of this.parts) {
      await part.cleanup(tenantId, source, budget);
    }
  }

  async assignRegion(
    tenantId: string,
    target: ShardLocation,
    region: string,
  ): Promise<void> {
    for (const part of this.parts) {
      await part.assignRegion(tenantId, target, region);
    }
  }

  private withBudget(transfer: TenantTransfer): TenantTransfer {
    return { ...transfer, budget: transfer.budget ?? this.newBudget() };
  }

  private newBudget(): TransferBudget {
    return new TransferBudget(this.clock, this.callBudgetMs);
  }
}
