import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { DataSource } from 'typeorm';
import { TenantDataTransfer } from './tenant-data-transfer.js';
import type { TenantTransfer } from './tenant-transfer.js';

/**
 * Varias copias de un mismo traslado sobre tablas distintas, una detrás de otra: la replicación lógica para las tablas
 * del servicio y la copia por lotes para las de la plataforma, que la replicación no puede filtrar por tenant.
 */
export class CompositeTenantDataTransfer extends TenantDataTransfer {
  constructor(private readonly parts: readonly TenantDataTransfer[]) {
    super();
  }

  async sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    const progress: TenantMoveProgress[] = [];
    for (const part of this.parts) {
      progress.push(await part.sync(transfer));
    }
    return {
      tables: progress.flatMap((entry) => entry.tables),
      caughtUp: progress.every((entry) => entry.caughtUp),
    };
  }

  async verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    const checks: TenantMoveVerification[] = [];
    for (const part of this.parts) {
      checks.push(await part.verify(transfer));
    }
    return {
      tables: checks.flatMap((entry) => entry.tables),
      verified: checks.every((entry) => entry.verified),
    };
  }

  async abort(transfer: TenantTransfer): Promise<void> {
    for (const part of this.parts) {
      await part.abort(transfer);
    }
  }

  async cleanup(tenantId: string, source: DataSource): Promise<void> {
    for (const part of this.parts) {
      await part.cleanup(tenantId, source);
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
}
