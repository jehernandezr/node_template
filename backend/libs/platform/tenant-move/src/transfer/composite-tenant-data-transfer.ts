import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { Clock } from '@platform/kernel';
import type { DataSource } from 'typeorm';
import { TenantDataTransfer } from './tenant-data-transfer.js';
import type { TenantTransfer } from './tenant-transfer.js';
import { TransferBudget } from './transfer-budget.js';

/**
 * Varias copias de un mismo traslado sobre tablas distintas, una detrás de otra: la replicación lógica para las tablas
 * del servicio y la copia por lotes para las de la plataforma, que la replicación no puede filtrar por tenant. Todas
 * las partes de una llamada gastan el mismo plazo, así la llamada nunca dura más que `callBudgetMs`.
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
    source: DataSource,
    budget: TransferBudget = this.newBudget(),
  ): Promise<void> {
    for (const part of this.parts) {
      await part.cleanup(tenantId, source, budget);
    }
  }

  async assignRegion(
    tenantId: string,
    target: DataSource,
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
