import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { Clock } from '@platform/kernel';
import { TimerScheduler } from '@platform/primitives';
import { QueryFailedError, type DataSource, type EntityManager } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../batch/sql-identifier.js';
import { TenantDataTransfer } from '../tenant-data-transfer.js';
import type { ShardLocation } from '@platform/persistence';
import type { ShardConnections } from '../typeorm/shard-connections.js';
import type { TenantTransfer } from '../tenant-transfer.js';
import { TransferBudget } from '../transfer-budget.js';
import type { LogicalReplicationOptions } from './logical-replication-options.js';
import { ReplicationNames } from './replication-names.js';

/** The connection data of a Postgres `DataSource`, with or without replicas. */
interface ConnectionFields {
  readonly host?: string;
  readonly port?: number;
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
}

interface ReplicatedTable {
  readonly table: string;
  readonly column: string;
}

/**
 * Copy with PostgreSQL logical replication: a publication on the source with the tenant row filter and a
 * subscription on the target that does the initial copy and follows the changes, including deletes. Requires
 * `wal_level=logical` on the source, a role with `REPLICATION` and permission to create subscriptions on the target, and network
 * access from the target to the source. The subscription applies changes with the role that creates it (`run_as_owner`), which must bypass
 * RLS: Postgres does not replicate into tables with RLS when the applying role is subject to it.
 *
 * A publication filter does not allow subqueries, so it only serves manifests whose tables have a
 * tenant column (`supports`). While any publication includes a table, the table keeps `REPLICA IDENTITY FULL`, which
 * the filter requires to replicate updates and deletes; the identity returns to normal when the last publication that
 * includes it is dropped. Creating and dropping publications takes a shard lock, so that two concurrent moves do not
 * leave a table published without the identity its filter needs. Changing the identity takes an exclusive lock
 * on the table, waited for only up to `lockTimeoutMs`, and while the publication lasts every change to the table
 * writes the full old row to the WAL. The final verification and reconciliation are
 * those of the batch copy.
 */
export class LogicalReplicationTransfer extends TenantDataTransfer {
  private static readonly POLL_MS = 100;
  /** Own advisory lock space for publications, to avoid clashing with other two-integer locks. */
  private static readonly PUBLICATIONS_LOCK_SPACE = 0x544d;
  private static readonly PUBLICATIONS_LOCK = `SELECT pg_advisory_xact_lock(${LogicalReplicationTransfer.PUBLICATIONS_LOCK_SPACE}, 0)`;
  /** SQLSTATE of an expired `lock_timeout`. */
  private static readonly LOCK_NOT_AVAILABLE = '55P03';
  private readonly tables: readonly ReplicatedTable[];

  /** Whether the manifest can be copied with logical replication: all its tables have a tenant column. */
  static supports(manifest: TenantMoveManifest): boolean {
    return manifest
      .tables()
      .every(
        (entry) => entry.selector.kind === TenantMoveSelectorKind.TenantColumn,
      );
  }

  /** @throws TenantMoveError `InvalidManifest` if any table reaches the tenant through its parent. */
  constructor(
    manifest: TenantMoveManifest,
    private readonly batch: TenantDataTransfer,
    private readonly connections: ShardConnections,
    private readonly clock: Clock,
    private readonly options: LogicalReplicationOptions,
  ) {
    super();
    this.tables = manifest.tables().map((entry) => {
      const selector = entry.selector;
      if (selector.kind !== TenantMoveSelectorKind.TenantColumn) {
        throw new TenantMoveError(
          TenantMoveErrorCode.InvalidManifest,
          'Logical replication only moves tables with a tenant column',
          { table: entry.table },
        );
      }
      return { table: entry.table, column: selector.column };
    });
  }

  override async sync(move: TenantTransfer): Promise<TenantMoveProgress> {
    const transfer = await this.connections.connect(move);
    const name = ReplicationNames.of(transfer.moveId);
    await this.publish(transfer.source, transfer.tenantId, name);
    await this.subscribe(transfer.target, transfer.source, name);
    const ready = await this.initialCopyDone(transfer.target, name);
    const pending = await this.pendingBytes(transfer.source, name);
    return {
      tables: this.tables.map(({ table }) => ({
        table,
        copiedRows: 0,
        pendingRows: 0,
      })),
      caughtUp: ready && pending <= this.options.caughtUpBytes,
    };
  }

  /** Waits for the subscription to receive all the WAL of the frozen source, drops it and verifies like the batch copy. */
  override async verify(move: TenantTransfer): Promise<TenantMoveVerification> {
    const transfer = await this.connections.connect(move);
    const name = ReplicationNames.of(transfer.moveId);
    const budget = transfer.budget ?? this.newBudget();
    if (await this.isSubscribed(transfer.target, name)) {
      const goal = await this.currentLsn(transfer.source);
      while (!(await this.reached(transfer.source, name, goal))) {
        budget.check(name);
        await LogicalReplicationTransfer.pause();
      }
    }
    await this.unsubscribe(transfer.target, transfer.source, name, budget);
    return this.batch.verify({ ...move, budget });
  }

  override async abort(move: TenantTransfer): Promise<void> {
    const transfer = await this.connections.connect(move);
    const budget = transfer.budget ?? this.newBudget();
    await this.unsubscribe(
      transfer.target,
      transfer.source,
      ReplicationNames.of(transfer.moveId),
      budget,
    );
    await this.batch.abort({ ...move, budget });
  }

  override async cleanup(
    tenantId: string,
    source: ShardLocation,
    budget?: TransferBudget,
  ): Promise<void> {
    await this.batch.cleanup(tenantId, source, budget);
  }

  override async assignRegion(
    tenantId: string,
    target: ShardLocation,
    region: string,
  ): Promise<void> {
    await this.batch.assignRegion(tenantId, target, region);
  }

  private async publish(
    source: DataSource,
    tenantId: string,
    name: string,
  ): Promise<void> {
    const literal = await this.literal(source, tenantId);
    await this.inPublicationsLock(source, async (manager) => {
      const exists: unknown[] = await manager.query(
        'SELECT 1 FROM pg_publication WHERE pubname = $1',
        [name],
      );
      if (exists.length > 0) {
        return;
      }
      await this.limitLockWait(manager);
      for (const { table } of this.tables) {
        await manager.query(
          `ALTER TABLE ${SqlIdentifier.quoteTable(table)} REPLICA IDENTITY FULL`,
        );
      }
      const tables = this.tables
        .map(
          ({ table, column }) =>
            `${SqlIdentifier.quoteTable(table)} WHERE (${SqlIdentifier.quote(column)} = ${literal})`,
        )
        .join(', ');
      await manager.query(`CREATE PUBLICATION ${name} FOR TABLE ${tables}`);
    });
    const slot: unknown[] = await source.query(
      'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1',
      [name],
    );
    if (slot.length === 0) {
      await source.query(
        "SELECT pg_create_logical_replication_slot($1, 'pgoutput')",
        [name],
      );
    }
  }

  /** The slot is created separately: creating it from the subscription blocks when source and target share a server. */
  private async subscribe(
    target: DataSource,
    source: DataSource,
    name: string,
  ): Promise<void> {
    if (await this.isSubscribed(target, name)) {
      return;
    }
    const connection = await this.literal(target, this.connectionOf(source));
    await target.query(
      `CREATE SUBSCRIPTION ${name} CONNECTION ${connection} PUBLICATION ${name} ` +
        `WITH (create_slot = false, slot_name = '${name}', copy_data = true, run_as_owner = true)`,
    );
  }

  /**
   * Drops the subscription, slot and publication, and returns to their normal replica identity the tables that are no longer in
   * any publication. Idempotent.
   */
  private async unsubscribe(
    target: DataSource,
    source: DataSource,
    name: string,
    budget: TransferBudget,
  ): Promise<void> {
    if (await this.isSubscribed(target, name)) {
      await target.query(`ALTER SUBSCRIPTION ${name} DISABLE`);
      await target.query(`ALTER SUBSCRIPTION ${name} SET (slot_name = NONE)`);
      await target.query(`DROP SUBSCRIPTION ${name}`);
    }
    await this.dropSlot(source, name, budget);
    await this.inPublicationsLock(source, async (manager) => {
      await manager.query(`DROP PUBLICATION IF EXISTS ${name}`);
      await this.limitLockWait(manager);
      for (const { table } of this.tables) {
        const published: unknown[] = await manager.query(
          'SELECT 1 FROM pg_publication_tables WHERE schemaname = current_schema() AND tablename = $1 LIMIT 1',
          [table],
        );
        if (published.length === 0) {
          await manager.query(
            `ALTER TABLE ${SqlIdentifier.quoteTable(table)} REPLICA IDENTITY DEFAULT`,
          );
        }
      }
    });
  }

  /**
   * Deletes the slot once nobody uses it: the process that sent changes to the subscription takes a moment to
   * finish after the subscription is dropped.
   * @throws TenantMoveError `RoundPending` if it is still in use when the call's budget runs out.
   */
  private async dropSlot(
    source: DataSource,
    name: string,
    budget: TransferBudget,
  ): Promise<void> {
    for (;;) {
      const slots: { active: boolean }[] = await source.query(
        'SELECT active FROM pg_replication_slots WHERE slot_name = $1',
        [name],
      );
      const [slot] = slots;
      if (slot === undefined) {
        return;
      }
      if (!slot.active) {
        await source.query('SELECT pg_drop_replication_slot($1)', [name]);
        return;
      }
      budget.check(name);
      await LogicalReplicationTransfer.pause();
    }
  }

  /**
   * A transaction holding the shard's publications lock. If a table lock is not acquired within
   * `lockTimeoutMs`, the round is repeated in the next call.
   * @throws TenantMoveError `RoundPending` if the wait for a lock ran out.
   */
  private async inPublicationsLock(
    source: DataSource,
    work: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    try {
      await source.transaction(async (manager) => {
        await manager.query(LogicalReplicationTransfer.PUBLICATIONS_LOCK);
        await work(manager);
      });
    } catch (error) {
      if (LogicalReplicationTransfer.isLockTimeout(error)) {
        throw new TenantMoveError(
          TenantMoveErrorCode.RoundPending,
          'A table lock for the publication did not arrive in time',
        );
      }
      throw error;
    }
  }

  /**
   * `REPLICA IDENTITY` takes an exclusive lock on the table: without a limit, it would wait behind a long transaction and
   * queue all the writes that arrive after it.
   */
  private async limitLockWait(manager: EntityManager): Promise<void> {
    await manager.query("SELECT set_config('lock_timeout', $1, true)", [
      `${this.options.lockTimeoutMs}ms`,
    ]);
  }

  private static isLockTimeout(error: unknown): boolean {
    const cause =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: unknown })
        : undefined;
    return cause?.code === LogicalReplicationTransfer.LOCK_NOT_AVAILABLE;
  }

  /**
   * pg_subscription is a server-wide catalog: without the filter it would see subscriptions from other databases.
   */
  private async isSubscribed(
    target: DataSource,
    name: string,
  ): Promise<boolean> {
    const rows: unknown[] = await target.query(
      `SELECT 1 FROM pg_subscription
        WHERE subname = $1 AND subdbid = (SELECT oid FROM pg_database WHERE datname = current_database())`,
      [name],
    );
    return rows.length > 0;
  }

  /** Whether the subscription's initial copy finished on all its tables. */
  private async initialCopyDone(
    target: DataSource,
    name: string,
  ): Promise<boolean> {
    const rows: { total: string; ready: string }[] = await target.query(
      `SELECT count(*)::text AS total, count(*) FILTER (WHERE r.srsubstate = 'r')::text AS ready
         FROM pg_subscription s JOIN pg_subscription_rel r ON r.srsubid = s.oid
        WHERE s.subname = $1`,
      [name],
    );
    const [row] = rows;
    return (
      row !== undefined &&
      Number(row.total) === this.tables.length &&
      row.total === row.ready
    );
  }

  private async pendingBytes(
    source: DataSource,
    name: string,
  ): Promise<number> {
    const rows: { pending: string | null }[] = await source.query(
      `SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)::text AS pending
         FROM pg_replication_slots WHERE slot_name = $1`,
      [name],
    );
    return Number(rows[0]?.pending ?? Number.POSITIVE_INFINITY);
  }

  private async currentLsn(source: DataSource): Promise<string> {
    const rows: { lsn: string }[] = await source.query(
      'SELECT pg_current_wal_lsn()::text AS lsn',
    );
    return rows[0]?.lsn ?? '0/0';
  }

  private async reached(
    source: DataSource,
    name: string,
    goal: string,
  ): Promise<boolean> {
    const rows: { reached: boolean }[] = await source.query(
      'SELECT confirmed_flush_lsn >= $2::pg_lsn AS reached FROM pg_replication_slots WHERE slot_name = $1',
      [name, goal],
    );
    return rows[0]?.reached === true;
  }

  /** Connection string to the source as the target server sees it. */
  private connectionOf(source: DataSource): string {
    const options = source.options as ConnectionFields & {
      readonly replication?: { readonly master: ConnectionFields };
    };
    const master = options.replication?.master ?? options;
    const parts: readonly (readonly [string, string | number | undefined])[] = [
      ['host', this.options.sourceHost ?? master.host],
      ['port', this.options.sourcePort ?? master.port],
      ['dbname', master.database],
      ['user', master.username],
      ['password', master.password],
    ];
    return parts
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) => `${key}='${String(value).replace(/['\\]/g, '\\$&')}'`,
      )
      .join(' ');
  }

  /** A text as an SQL literal with the quotes the server itself adds, for statements without parameters. */
  private async literal(
    dataSource: DataSource,
    value: string,
  ): Promise<string> {
    const rows: { literal: string }[] = await dataSource.query(
      'SELECT quote_literal($1::text) AS literal',
      [value],
    );
    return rows[0]?.literal ?? "''";
  }

  private newBudget(): TransferBudget {
    return new TransferBudget(this.clock, this.options.callBudgetMs);
  }

  private static pause(): Promise<void> {
    return new Promise((resolve) => {
      TimerScheduler.arm(LogicalReplicationTransfer.POLL_MS, resolve);
    });
  }
}
