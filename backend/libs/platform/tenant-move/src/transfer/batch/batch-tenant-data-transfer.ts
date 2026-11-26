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
import type { ShardLocation } from '@platform/persistence';
import type { ConnectedTransfer } from '../typeorm/connected-transfer.js';
import type { ShardConnections } from '../typeorm/shard-connections.js';
import type { TenantTransfer } from '../tenant-transfer.js';
import { TransferBudget } from '../transfer-budget.js';
import type { BatchTransferOptions } from './batch-transfer-options.js';
import type { RowPage } from './row-page.js';
import { ForeignKeyRound } from './foreign-key-round.js';
import { TableCopier } from './table-copier.js';
import type { TableChecksum } from './table-checksum.js';
import { TableShapeReader } from './table-shape-reader.js';
import { TenantRowFilter } from './tenant-row-filter.js';
import { TenantSession } from './tenant-session.js';
import { TransferCheckpoints } from './transfer-checkpoints.js';

/**
 * Batch copy. It keeps no state between calls: the initial copy continues from the highest key the
 * target already has (ids are UUIDv7 and grow over time), and each delta round rereads from the latest `updated_at`
 * on the target minus a margin. Writes are `INSERT ... ON CONFLICT` by primary key, so repeating a
 * batch duplicates nothing.
 *
 * A table without `updated_at` only copies its new rows in the `sync` rounds. Its changes, hard deletes and
 * transactions that commit later than the margin are not seen by the delta rounds: they are
 * fixed by `verify`, which with the tenant frozen first deletes, children first, the target rows the source no longer
 * has, so a parent is never deleted while a child still references it, and then compares count and sum of each table
 * and, if they differ, reconciles it in ranges of `batchSize` rows: it compares each range and only rewrites those
 * that differ. Progress is stored in `tenant_move_checkpoints` on the target, so a table that does not fit in one
 * call's deadline continues on the next.
 */
export class BatchTenantDataTransfer extends TenantDataTransfer {
  private readonly filter: TenantRowFilter;
  private readonly shapes = new TableShapeReader();
  private readonly session = new TenantSession();
  private readonly checkpoints = new TransferCheckpoints();

  constructor(
    private readonly manifest: TenantMoveManifest,
    private readonly connections: ShardConnections,
    private readonly clock: Clock,
    private readonly options: BatchTransferOptions,
  ) {
    super();
    this.filter = new TenantRowFilter(manifest);
  }

  /**
   * Copies the rows written since the last round, table by table.
   * @throws TenantMoveError `RoundPending` if a child row reaches the target before its parent.
   */
  override async sync(move: TenantTransfer): Promise<TenantMoveProgress> {
    return ForeignKeyRound.run(() => this.syncRound(move));
  }

  /**
   * Compares and reconciles each table with the tenant frozen.
   * @throws TenantMoveError `RoundPending` if a child row reaches the target before its parent.
   */
  override async verify(move: TenantTransfer): Promise<TenantMoveVerification> {
    return ForeignKeyRound.run(() => this.verifyRound(move));
  }

  private async syncRound(move: TenantTransfer): Promise<TenantMoveProgress> {
    const transfer = await this.connections.connect(move);
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

  private async verifyRound(
    move: TenantTransfer,
  ): Promise<TenantMoveVerification> {
    const transfer = await this.connections.connect(move);
    const budget = transfer.budget ?? this.newBudget();
    const copiers = await this.copiers(transfer.source);
    for (const { table, copier } of [...copiers].reverse()) {
      await this.prune(transfer, table, copier, budget);
    }
    const tables: TenantMoveTableCheck[] = [];
    for (const { table, copier } of copiers) {
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

  override async abort(move: TenantTransfer): Promise<void> {
    const transfer = await this.connections.connect(move);
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

  override async cleanup(
    tenantId: string,
    source: ShardLocation,
    budget: TransferBudget = this.newBudget(),
  ): Promise<void> {
    await this.purge(tenantId, await this.connections.get(source), budget);
  }

  override async assignRegion(
    tenantId: string,
    location: ShardLocation,
    region: string,
  ): Promise<void> {
    const target = await this.connections.get(location);
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

  /** The last round of a table and its comparison, continuing where the previous call left off. */
  private async verifyTable(
    transfer: ConnectedTransfer,
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

  /**
   * Initial copy and one delta round of a table. Returns how many rows it inserted or changed on the target. A table without
   * `updated_at` (a log like `login_attempts`) only receives its new rows: rereading it in full on every call
   * would always exhaust the deadline on it. What changed or was deleted there is fixed by `verify` in ranges.
   */
  private async copy(
    transfer: ConnectedTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<number> {
    const initial = await this.copyNewRows(transfer, table, copier, budget);
    if (!copier.tracksUpdates()) {
      return initial;
    }
    const delta = await this.copyChangedRows(transfer, table, copier, budget);
    return initial + delta;
  }

  private async copyNewRows(
    transfer: ConnectedTransfer,
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
   * Rereads what changed from the target mark minus the margin up to the latest source change at the start,
   * so the round finishes even if writes continue. Without `updated_at`, the table is reread in full up to the last
   * source key: identical rows are not rewritten.
   */
  private async copyChangedRows(
    transfer: ConnectedTransfer,
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

  /** Start of the delta round, or `undefined` to reread the whole table. */
  private async deltaStart(
    transfer: ConnectedTransfer,
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
   * Walks the table in ranges of `batchSize` source rows from `from` and rewrites the source rows of each range that
   * differs. The target rows the source no longer has were already deleted by `prune`.
   */
  private async reconcile(
    transfer: ConnectedTransfer,
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

  /**
   * Deletes from the target, in pages of `batchSize` keys from the last checkpoint, the rows the frozen source no
   * longer has. It runs children first, so the foreign key of a child never blocks deleting its parent.
   */
  private async prune(
    transfer: ConnectedTransfer,
    table: string,
    copier: TableCopier,
    budget: TransferBudget,
  ): Promise<void> {
    const checkpoint = await this.onTarget(transfer, (runner) =>
      this.checkpoints.read(runner, transfer.moveId, table),
    );
    if (checkpoint.verified !== undefined || checkpoint.pruned === true) {
      return;
    }
    let after = checkpoint.prunedKey;
    for (;;) {
      budget.check(table);
      const cursor = after;
      const keys = await this.onTarget(transfer, (runner) =>
        copier.keysIn(
          runner,
          transfer.tenantId,
          { after: cursor, upTo: undefined },
          this.options.batchSize,
        ),
      );
      if (keys !== undefined) {
        const present = await this.onSource(transfer, (runner) =>
          copier.existing(runner, transfer.tenantId, keys.ids),
        );
        const gone = keys.ids.filter((id) => !present.has(id));
        await this.onTarget(transfer, (runner) =>
          copier.deleteKeys(runner, transfer.tenantId, gone),
        );
      }
      after = keys?.lastKey;
      await this.onTarget(transfer, (runner) =>
        this.checkpoints.prunedUpTo(runner, transfer.moveId, table, after),
      );
      if (after === undefined) {
        return;
      }
    }
  }

  private async compare(
    transfer: ConnectedTransfer,
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

  /** Deletes the tenant rows from the manifest tables, children first. */
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
    transfer: ConnectedTransfer,
    fn: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    return this.session.run(transfer.source, transfer.tenantId, fn);
  }

  private onTarget<T>(
    transfer: ConnectedTransfer,
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
