import type {
  TenantMoveProgress,
  TenantMoveTableCheck,
  TenantMoveTableProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { Clock } from '@platform/kernel';
import type { DataSource, QueryRunner } from 'typeorm';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { TenantDataTransfer } from '../tenant-data-transfer.js';
import type { TenantTransfer } from '../tenant-transfer.js';
import { TransferBudget } from '../transfer-budget.js';
import type { BatchTransferOptions } from './batch-transfer-options.js';
import type { KeyRange } from './key-range.js';
import type { RowPage } from './row-page.js';
import { TableCopier } from './table-copier.js';
import type { TableChecksum } from './table-checksum.js';
import { TableShapeReader } from './table-shape-reader.js';
import { TenantRowFilter } from './tenant-row-filter.js';
import { TenantSession } from './tenant-session.js';
import { TransferCheckpoints } from './transfer-checkpoints.js';

/**
 * Copia por lotes. No guarda estado entre llamadas: la copia inicial sigue desde la llave más alta que ya tiene el
 * destino (los ids son UUIDv7 y crecen con el tiempo), y cada ronda delta relee desde el `updated_at` más reciente
 * del destino menos un margen. Las escrituras son `INSERT ... ON CONFLICT` por llave primaria, así que repetir un
 * lote no duplica nada.
 *
 * Los borrados físicos y las transacciones que confirman más tarde que el margen no los ven las rondas delta: los
 * corrige `verify`, que con el tenant congelado compara conteo y suma de cada tabla y, si difieren, la reconcilia por
 * tramos de `batchSize` filas: compara cada tramo y solo reescribe los que difieren. El avance queda en
 * `tenant_move_checkpoints` del destino, así una tabla que no cabe en el plazo de una llamada sigue en la siguiente.
 */
export class BatchTenantDataTransfer extends TenantDataTransfer {
  private readonly filter: TenantRowFilter;
  private readonly shapes = new TableShapeReader();
  private readonly session = new TenantSession();
  private readonly checkpoints = new TransferCheckpoints();

  constructor(
    private readonly manifest: TenantMoveManifest,
    private readonly clock: Clock,
    private readonly options: BatchTransferOptions,
  ) {
    super();
    this.filter = new TenantRowFilter(manifest);
  }

  async sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    const budget = transfer.budget ?? this.newBudget();
    const tables: TenantMoveTableProgress[] = [];
    let changed = 0;
    for (const copier of await this.copiers(transfer.source)) {
      const copied = await this.copy(
        transfer,
        copier.table,
        copier.copier,
        budget,
      );
      changed += copied;
      tables.push({ table: copier.table, copiedRows: copied, pendingRows: 0 });
    }
    return { tables, caughtUp: changed <= this.options.caughtUpRows };
  }

  async verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    const budget = transfer.budget ?? this.newBudget();
    const tables: TenantMoveTableCheck[] = [];
    for (const { table, copier } of await this.copiers(transfer.source)) {
      tables.push(await this.verifyTable(transfer, table, copier, budget));
    }
    const verified = tables.every((check) =>
      BatchTenantDataTransfer.matches(check),
    );
    if (verified) {
      await this.checkpoints.forget(
        transfer.target,
        transfer.moveId,
        this.tableNames(),
      );
    }
    return { verified, tables };
  }

  async abort(transfer: TenantTransfer): Promise<void> {
    await this.purge(
      transfer.tenantId,
      transfer.target,
      transfer.budget ?? this.newBudget(),
    );
    await this.checkpoints.forget(
      transfer.target,
      transfer.moveId,
      this.tableNames(),
    );
  }

  async cleanup(
    tenantId: string,
    source: DataSource,
    budget: TransferBudget = this.newBudget(),
  ): Promise<void> {
    await this.purge(tenantId, source, budget);
  }

  async assignRegion(
    tenantId: string,
    target: DataSource,
    region: string,
  ): Promise<void> {
    const columns = new Map(
      this.manifest
        .tables()
        .flatMap((entry) =>
          entry.regionColumn === undefined
            ? []
            : [[entry.table, entry.regionColumn] as const],
        ),
    );
    for (const { table, copier } of await this.copiers(target)) {
      const column = columns.get(table);
      if (column !== undefined) {
        await this.session.run(target, tenantId, (runner) =>
          copier.assign(runner, tenantId, column, region),
        );
      }
    }
  }

  /** La última ronda de una tabla y su comparación, siguiendo donde quedó la llamada anterior. */
  private async verifyTable(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<TenantMoveTableCheck> {
    const checkpoint = await this.onTarget(transfer, (runner) =>
      this.checkpoints.read(runner, transfer.moveId, table),
    );
    if (checkpoint.verified !== undefined) {
      return BatchTenantDataTransfer.checkOf(
        table,
        checkpoint.verified,
        checkpoint.verified,
      );
    }
    await this.copyNewRows(transfer, table, copier, budget);
    if (copier.tracksUpdates()) {
      await this.copyChangedRows(transfer, table, copier, budget);
    }
    let check = await this.compare(transfer, table, copier, budget);
    if (!BatchTenantDataTransfer.matches(check)) {
      await this.reconcile(
        transfer,
        table,
        copier,
        budget,
        checkpoint.reconciledKey,
      );
      check = await this.compare(transfer, table, copier, budget);
    }
    await this.onTarget(transfer, (runner) =>
      BatchTenantDataTransfer.matches(check)
        ? this.checkpoints.verified(runner, transfer.moveId, table, {
            rows: check.sourceRows,
            checksum: check.sourceChecksum,
          })
        : this.checkpoints.reconciledUpTo(
            runner,
            transfer.moveId,
            table,
            undefined,
          ),
    );
    return check;
  }

  /** Copia inicial y una ronda delta de una tabla. Devuelve cuántas filas insertó o cambió en el destino. */
  private async copy(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<number> {
    const initial = await this.copyNewRows(transfer, table, copier, budget);
    const delta = await this.copyChangedRows(transfer, table, copier, budget);
    return initial + delta;
  }

  private async copyNewRows(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<number> {
    let after = await this.onTarget(transfer, (runner) =>
      copier.lastKey(runner, transfer.tenantId),
    );
    const upTo = await this.onSource(transfer, (runner) =>
      copier.lastKey(runner, transfer.tenantId),
    );
    let written = 0;
    while (upTo !== undefined) {
      budget.check(table);
      const cursor = after;
      const page = await this.onSource(transfer, (runner) =>
        copier.readAfterKey(
          runner,
          transfer.tenantId,
          cursor,
          this.options.batchSize,
          upTo,
        ),
      );
      if (page === undefined) {
        return written;
      }
      written += await this.onTarget(transfer, (runner) =>
        copier.upsert(runner, page.rows),
      );
      after = page.lastKey;
    }
    return written;
  }

  /**
   * Relee lo cambiado desde la marca del destino menos el margen hasta el cambio más reciente del origen al empezar,
   * así la ronda termina aunque las escrituras sigan. Sin `updated_at`, la tabla se relee completa hasta la última
   * llave del origen: las filas iguales no se reescriben.
   */
  private async copyChangedRows(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<number> {
    const since = await this.deltaStart(transfer, copier);
    const until =
      since === undefined
        ? undefined
        : await this.onSource(transfer, (runner) =>
            copier.latestUpdate(runner, transfer.tenantId),
          );
    const upTo = await this.onSource(transfer, (runner) =>
      copier.lastKey(runner, transfer.tenantId),
    );
    let after: RowPage | undefined;
    let written = 0;
    while (upTo !== undefined) {
      budget.check(table);
      const cursor = after;
      const page = await this.onSource(transfer, (runner) =>
        since === undefined || until === undefined
          ? copier.readAfterKey(
              runner,
              transfer.tenantId,
              cursor?.lastKey,
              this.options.batchSize,
              upTo,
            )
          : copier.readChangedSince(
              runner,
              transfer.tenantId,
              { since, until },
              cursor,
              this.options.batchSize,
            ),
      );
      if (page === undefined) {
        return written;
      }
      written += await this.onTarget(transfer, (runner) =>
        copier.upsert(runner, page.rows),
      );
      after = page;
    }
    return written;
  }

  /** Inicio de la ronda delta, o `undefined` para releer la tabla completa. */
  private async deltaStart(
    transfer: TenantTransfer,
    copier: TableCopier,
  ): Promise<string | undefined> {
    if (!copier.tracksUpdates()) {
      return undefined;
    }
    const latest = await this.onTarget(transfer, (runner) =>
      copier.latestUpdate(runner, transfer.tenantId),
    );
    if (latest === undefined) {
      return undefined;
    }
    return new Date(
      new Date(latest).getTime() - this.options.deltaMarginMs,
    ).toISOString();
  }

  /**
   * Recorre la tabla por tramos de `batchSize` filas del origen desde `from`. En cada tramo que difiere borra del
   * destino las filas que el origen ya no tiene y reescribe las del origen; el último tramo no tiene límite superior,
   * así también borra las filas del destino que quedaron después de la última del origen.
   */
  private async reconcile(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
    from: readonly string[] | undefined,
  ): Promise<void> {
    let after = from;
    for (;;) {
      budget.check(table);
      const start = after;
      const upTo = await this.onSource(transfer, (runner) =>
        copier.keyAt(runner, transfer.tenantId, start, this.options.batchSize),
      );
      const range = { after: start, upTo };
      const source = await this.onSource(transfer, (runner) =>
        copier.checksum(runner, transfer.tenantId, range),
      );
      const target = await this.onTarget(transfer, (runner) =>
        copier.checksum(runner, transfer.tenantId, range),
      );
      if (
        !BatchTenantDataTransfer.matches(
          BatchTenantDataTransfer.checkOf(table, source, target),
        )
      ) {
        await this.deleteGone(transfer, table, copier, budget, range);
        const page = await this.onSource(transfer, (runner) =>
          copier.readAfterKey(
            runner,
            transfer.tenantId,
            start,
            this.options.batchSize,
            upTo,
          ),
        );
        await this.onTarget(transfer, (runner) =>
          copier.upsert(runner, page?.rows ?? []),
        );
      }
      if (upTo === undefined) {
        return;
      }
      after = upTo;
      await this.onTarget(transfer, (runner) =>
        this.checkpoints.reconciledUpTo(runner, transfer.moveId, table, upTo),
      );
    }
  }

  /** Borra del destino las filas del tramo que el origen ya no tiene. */
  private async deleteGone(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
    range: KeyRange,
  ): Promise<void> {
    let after = range.after;
    for (;;) {
      budget.check(table);
      const cursor = after;
      const keys = await this.onTarget(transfer, (runner) =>
        copier.keysIn(
          runner,
          transfer.tenantId,
          { after: cursor, upTo: range.upTo },
          this.options.batchSize,
        ),
      );
      if (keys === undefined) {
        return;
      }
      const present = await this.onSource(transfer, (runner) =>
        copier.existing(runner, transfer.tenantId, keys.ids),
      );
      const gone = keys.ids.filter((id) => !present.has(id));
      await this.onTarget(transfer, (runner) =>
        copier.deleteKeys(runner, transfer.tenantId, gone),
      );
      after = keys.lastKey;
    }
  }

  private async compare(
    transfer: TenantTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<TenantMoveTableCheck> {
    budget.check(table);
    const source = await this.onSource(transfer, (runner) =>
      copier.checksum(runner, transfer.tenantId),
    );
    const target = await this.onTarget(transfer, (runner) =>
      copier.checksum(runner, transfer.tenantId),
    );
    return BatchTenantDataTransfer.checkOf(table, source, target);
  }

  /** Borra las filas del tenant de las tablas del manifiesto, los hijos primero. */
  private async purge(
    tenantId: string,
    dataSource: DataSource,
    budget: TransferBudget,
  ): Promise<void> {
    const copiers = await this.copiers(dataSource);
    for (const { table, copier } of [...copiers].reverse()) {
      let deleted: number;
      do {
        budget.check(table);
        deleted = await this.session.run(dataSource, tenantId, (runner) =>
          copier.deleteBatch(runner, tenantId, this.options.batchSize),
        );
      } while (deleted > 0);
    }
  }

  private newBudget(): TransferBudget {
    return new TransferBudget(this.clock, this.options.callBudgetMs);
  }

  private tableNames(): string[] {
    return this.manifest.tables().map((entry) => entry.table);
  }

  private async copiers(
    dataSource: DataSource,
  ): Promise<{ readonly table: string; readonly copier: TableCopier }[]> {
    const runner = dataSource.createQueryRunner('master');
    try {
      const result = [];
      for (const entry of this.manifest.tables()) {
        const shape = await this.shapes.read(runner, entry.table);
        result.push({
          table: entry.table,
          copier: new TableCopier(shape, this.filter),
        });
      }
      return result;
    } finally {
      await runner.release();
    }
  }

  private onSource<T>(
    transfer: TenantTransfer,
    fn: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    return this.session.run(transfer.source, transfer.tenantId, fn);
  }

  private onTarget<T>(
    transfer: TenantTransfer,
    fn: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    return this.session.run(transfer.target, transfer.tenantId, fn);
  }

  private static checkOf(
    table: string,
    source: TableChecksum,
    target: TableChecksum,
  ): TenantMoveTableCheck {
    return {
      table,
      sourceRows: source.rows,
      targetRows: target.rows,
      sourceChecksum: source.checksum,
      targetChecksum: target.checksum,
    };
  }

  private static matches(check: TenantMoveTableCheck): boolean {
    return (
      check.sourceRows === check.targetRows &&
      check.sourceChecksum === check.targetChecksum
    );
  }
}
