import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import { QueryFailedError, type DataSource } from 'typeorm';
import { TenantDataTransfer } from '../../transfer/tenant-data-transfer.js';
import type { TenantTransfer } from '../../transfer/tenant-transfer.js';
import type { TransferBudget } from '../../transfer/transfer-budget.js';

/** Copia que delega todo en la real; las subclases cambian un paso para reproducir un escenario. */
export class DelegatingTransfer extends TenantDataTransfer {
  constructor(protected readonly inner: TenantDataTransfer) {
    super();
  }

  /** Delega en la copia real. */
  sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    return this.inner.sync(transfer);
  }

  /** Delega en la copia real. */
  verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    return this.inner.verify(transfer);
  }

  /** Delega en la copia real. */
  abort(transfer: TenantTransfer): Promise<void> {
    return this.inner.abort(transfer);
  }

  /** Delega en la copia real. */
  cleanup(
    tenantId: string,
    source: DataSource,
    budget?: TransferBudget,
  ): Promise<void> {
    return this.inner.cleanup(tenantId, source, budget);
  }

  /** Delega en la copia real. */
  assignRegion(
    tenantId: string,
    target: DataSource,
    region: string,
  ): Promise<void> {
    return this.inner.assignRegion(tenantId, target, region);
  }
}

/**
 * La primera ronda falla como cuando el servicio escribe un padre y su hijo entre la copia de la tabla padre y la de
 * la hija: el hijo llega al destino sin su padre y `pg` responde la violación de llave foránea.
 */
export class ForeignKeyRaceTransfer extends DelegatingTransfer {
  private static readonly FOREIGN_KEY_VIOLATION = '23503';
  private raced = false;

  /** La primera vez falla con la llave foránea; después copia de verdad. */
  override sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    if (this.raced) {
      return super.sync(transfer);
    }
    this.raced = true;
    return Promise.reject(
      new QueryFailedError(
        'INSERT INTO "invoice_lines" ...',
        [],
        Object.assign(
          new Error(
            'insert violates foreign key constraint "invoice_lines_invoice_fk"',
          ),
          { code: ForeignKeyRaceTransfer.FOREIGN_KEY_VIOLATION },
        ),
      ),
    );
  }
}

/** Corre `probe` justo antes de descartar la copia, para ver en qué estado queda el tenant mientras se purga. */
export class ProbedAbortTransfer extends DelegatingTransfer {
  constructor(
    inner: TenantDataTransfer,
    private readonly probe: () => Promise<void>,
  ) {
    super(inner);
  }

  /** Mira el estado y después purga el destino. */
  override async abort(transfer: TenantTransfer): Promise<void> {
    await this.probe();
    await super.abort(transfer);
  }
}
