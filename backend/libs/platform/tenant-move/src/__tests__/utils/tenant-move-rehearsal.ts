import type {
  TenantMoveRef,
  TenantMoveVerification,
} from '@contracts/platform';
import {
  SystemClock,
  UuidV7IdGenerator,
  SystemRandomSource,
} from '@platform/kernel';
import { platformSagaShardMigrations } from '@platform/adapters-postgres';
import { TenantWriteFence, type MigrationClass } from '@platform/persistence';
import { SagaStatus } from '@platform/saga';
import { ManifestRowWriter } from './manifest-row-writer.js';
import { PendingRounds } from './pending-rounds.js';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import {
  DirectoryWriteGate,
  PlacementTransition,
  type TenantPlacement,
} from '@platform/sharding';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import type { DataSource } from 'typeorm';
import { ShardTenantMoveFence } from '../../fence/shard-tenant-move-fence.js';
import { PooledShardConnections } from '../../transfer/typeorm/pooled-shard-connections.js';
import { OpenSagaActivity } from '../../activity/open-saga-activity.js';
import { TenantMoveShards } from '../../application/tenant-move-shards.js';
import { TenantMoves } from '../../application/tenant-moves.js';
import { MergedTenantMoveManifest } from '../../manifest/merged-tenant-move-manifest.js';
import { PlatformTenantMoveManifest } from '../../manifest/platform-tenant-move-manifest.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { TenantMoveTargets } from '../../targets/tenant-move-targets.js';
import { BatchTenantDataTransfer } from '../../transfer/batch/batch-tenant-data-transfer.js';
import type { BatchTransferOptions } from '../../transfer/batch/batch-transfer-options.js';
import type { TableChecksum } from '../../transfer/batch/table-checksum.js';
import { TableCopier } from '../../transfer/batch/table-copier.js';
import type { TenantDataTransfer } from '../../transfer/tenant-data-transfer.js';
import { TableShapeReader } from '../../transfer/batch/table-shape-reader.js';
import { TenantRowFilter } from '../../transfer/batch/tenant-row-filter.js';
import { TenantSession } from '../../transfer/batch/tenant-session.js';
import { ManifestRowSeeder, type FixedColumns } from './manifest-row-seeder.js';
import { RehearsalTransferOptions } from './rehearsal-transfer-options.js';

/** The two rehearsal shards. */
export enum RehearsalShard {
  A = 'test_shard_0',
  B = 'test_shard_1',
}

/** Options of {@link TenantMoveRehearsal}. */
export interface TenantMoveRehearsalOptions {
  readonly manifest: TenantMoveManifest;
  /** Migrations of each shard: the platform ones and the service ones. */
  readonly shardMigrations: readonly MigrationClass[];
  readonly fixedColumns?: FixedColumns;
  /** Extensions that provisioning creates in each shard before migrating. */
  readonly extensions?: readonly string[];
  /**
   * Rows per batch of a quiet move; a small one makes each table get copied in several batches. A move under writes
   * always copies in the service batch.
   */
  readonly batchSize?: number;
}

/** A copy and the settings it was built with. */
interface RehearsalCopy {
  readonly transfer: TenantDataTransfer;
  readonly options: BatchTransferOptions;
}

/** The `TenantMoves` parts the rehearsal builds once and shares across its variants. */
interface RehearsalParts {
  readonly shards: TenantMoveShards;
  readonly transfer: TenantDataTransfer;
  /** The copy of a move whose tenant keeps writing, in the service batch. */
  readonly underWrites: RehearsalCopy;
  readonly gate: DirectoryWriteGate;
  readonly transition: PlacementTransition;
}

/** Count and sum of each manifest table. */
export type ManifestChecksums = Readonly<Record<string, TableChecksum>>;

/** Rows of each manifest table. */
export type ManifestRows = Readonly<Record<string, number>>;

/** What a full rehearsal leaves: a tenant seeded in A, moved to B and cleaned from A, with a neighbor in A. */
export interface RehearsalReport {
  readonly tenantId: string;
  readonly seeded: ManifestChecksums;
  /** What `finalize` compared on each side, with the source frozen. */
  readonly verifiedSource: ManifestChecksums;
  readonly verifiedTarget: ManifestChecksums;
  readonly verified: boolean;
  readonly movedRows: ManifestRows;
  readonly leftInSource: ManifestRows;
  readonly neighbourBefore: ManifestChecksums;
  readonly neighbourAfter: ManifestChecksums;
}

/** What a rehearsal with writes during the copy leaves: what the move froze and copied, and what the writers did. */
export interface WritesRehearsalReport {
  readonly verified: boolean;
  /** What `finalize` compared on each side, with the source frozen. */
  readonly verifiedSource: ManifestChecksums;
  readonly verifiedTarget: ManifestChecksums;
  /** The source once the move switched: equal to what was verified unless a write got past the freeze. */
  readonly sourceAfterSwitch: ManifestChecksums;
  /** Writes that committed before the freeze, and writes the fence turned away after it. */
  readonly acked: number;
  readonly rejected: number;
  /** Rows per batch the copy used while the writers ran. */
  readonly copyBatchSize: number;
}

/**
 * Move rehearsal of a service on its real migrations: a PostgreSQL with two shards and `TenantMoves`
 * wired without NestJS, with the directory in memory and the fence in the shards. Each shard is a target group with
 * its own region, so each move changes shard and region.
 */
export class TenantMoveRehearsal {
  /** Pause of each writer between two writes, so the copy rounds keep up with them. */
  static readonly WRITE_PAUSE_MS = 20;

  static readonly REGIONS: Readonly<Record<RehearsalShard, string>> = {
    [RehearsalShard.A]: 'rehearsal-a',
    [RehearsalShard.B]: 'rehearsal-b',
  };

  /** The seeded sagas already finished: an open one would hold back the move. */
  private static readonly SETTLED_SAGAS: FixedColumns = {
    [PlatformTenantMoveManifest.SAGA_INSTANCES]: {
      status: () => SagaStatus.Completed,
    },
  };

  readonly fence = new TenantWriteFence();
  /** The service manifest with the platform tables, as the module copies it. */
  readonly manifest: TenantMoveManifest;
  readonly db: ShardedTestDatabase;
  private readonly ids = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );
  private readonly seeder: ManifestRowSeeder;
  private readonly filter: TenantRowFilter;
  private readonly session = new TenantSession();
  private readonly transferOptions: RehearsalTransferOptions;
  private moves: TenantMoves | undefined;
  private parts: RehearsalParts | undefined;

  constructor(options: TenantMoveRehearsalOptions) {
    this.db = new ShardedTestDatabase({
      shard: {
        entities: [],
        migrations: [
          ...options.shardMigrations,
          ...platformSagaShardMigrations,
        ],
      },
      catalog: { entities: [], migrations: [] },
      shardExtensions: options.extensions ?? [],
      fence: this.fence,
    });
    this.manifest = new MergedTenantMoveManifest([
      options.manifest,
      new PlatformTenantMoveManifest(),
    ]);
    this.seeder = new ManifestRowSeeder(this.manifest, {
      ...TenantMoveRehearsal.SETTLED_SAGAS,
      ...options.fixedColumns,
    });
    this.filter = new TenantRowFilter(this.manifest);
    this.transferOptions = new RehearsalTransferOptions(options.batchSize);
  }

  async start(): Promise<void> {
    await this.db.start();
    await this.db.migrate();
    const transition = new PlacementTransition(
      this.db.directory,
      this.db.router,
    );
    const targets = new TenantMoveTargets(
      Object.fromEntries(
        Object.values(RehearsalShard).map((shard) => [
          shard,
          { region: TenantMoveRehearsal.REGIONS[shard], shard },
        ]),
      ),
    );
    this.parts = {
      shards: new TenantMoveShards(this.db.router, this.db.directory, targets),
      transfer: this.batchTransfer(this.transferOptions.quiet()),
      underWrites: {
        transfer: this.batchTransfer(this.transferOptions.underWrites()),
        options: this.transferOptions.underWrites(),
      },
      gate: new DirectoryWriteGate(this.db.router, transition),
      transition,
    };
    this.moves = this.assemble(this.parts.transfer);
  }

  async stop(): Promise<void> {
    await this.db.stop();
  }

  /**
   * Seeds a tenant and a neighbor in A, moves the tenant to B while the neighbor stays, and cleans A. The report
   * checks that each table arrived whole and unchanged, that the source was left empty and that the neighbor was not touched.
   */
  async rehearse(rowsPerTable = 2): Promise<RehearsalReport> {
    const tenantId = this.ids.next().toString();
    const neighbour = this.ids.next().toString();
    await this.seed(tenantId, RehearsalShard.A, rowsPerTable);
    await this.seed(neighbour, RehearsalShard.A, rowsPerTable);
    const seeded = await this.checksums(RehearsalShard.A, tenantId);
    const neighbourBefore = await this.checksums(RehearsalShard.A, neighbour);
    const { ref, verification } = await this.move(tenantId, RehearsalShard.B);
    const movedRows = TenantMoveRehearsal.rowsOf(
      await this.checksums(RehearsalShard.B, tenantId),
    );
    await this.cleanup(ref);
    return {
      tenantId,
      seeded,
      verifiedSource: TenantMoveRehearsal.sidesOf(verification).source,
      verifiedTarget: TenantMoveRehearsal.sidesOf(verification).target,
      verified: verification.verified,
      movedRows,
      leftInSource: TenantMoveRehearsal.rowsOf(
        await this.checksums(RehearsalShard.A, tenantId),
      ),
      neighbourBefore,
      neighbourAfter: await this.checksums(RehearsalShard.A, neighbour),
    };
  }

  /**
   * Moves a tenant while two writers keep changing it, as its service would: each write touches every tenant row and,
   * with `inserts`, adds a row to each table. The writers run until the fence freezes the tenant; the report compares
   * the frozen source with the copy.
   * @param rowsPerTable Rows seeded in each table before the move.
   * @param inserts Whether each write also adds rows; off for services that allow one row per tenant in a table.
   * @returns What the move froze and copied, and how many writes committed and were turned away.
   */
  async rehearseUnderWrites(
    rowsPerTable = 2,
    inserts = true,
  ): Promise<WritesRehearsalReport> {
    return this.rehearseWrites(
      rowsPerTable,
      inserts,
      this.assembled().underWrites,
      Number.POSITIVE_INFINITY,
    );
  }

  /**
   * Moves a tenant in the batch the suite asked for while two writers make a bounded number of writes each, adding a
   * row to each table per write. With more seeded rows than the batch, the keyset copy crosses several batches while
   * the writers insert between them, and the bound lets the delta rounds catch up.
   * @param rowsPerTable Rows seeded in each table before the move.
   * @param writesPerWriter Writes each writer makes before it stops.
   * @returns What the move froze and copied, and how many writes committed and were turned away.
   */
  async rehearseBoundedWrites(
    rowsPerTable: number,
    writesPerWriter: number,
  ): Promise<WritesRehearsalReport> {
    const options = this.transferOptions.quiet();
    return this.rehearseWrites(
      rowsPerTable,
      true,
      { transfer: this.batchTransfer(options), options },
      writesPerWriter,
    );
  }

  /** The same rows in each manifest table, to compare with a report. */
  everyTable(rows: number): ManifestRows {
    return Object.fromEntries(
      this.manifest.tables().map((entry) => [entry.table, rows]),
    );
  }

  /** Places a new tenant on the given shard, with that shard's region. */
  place(tenantId: string, shard: RehearsalShard): void {
    this.db.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(tenantId)
        .withRegion(TenantMoveRehearsal.REGIONS[shard])
        .withShardGroup(shard)
        .build(),
    );
  }

  /** Places the tenant on the shard and seeds its rows in each manifest table. */
  async seed(
    tenantId: string,
    shard: RehearsalShard,
    rowsPerTable = 2,
  ): Promise<void> {
    this.place(tenantId, shard);
    await this.seeder.seed(await this.shard(shard), tenantId, rowsPerTable);
  }

  /** Runs the full move up to `switch`, repeating each step while its round is not finished, like the saga. */
  async move(
    tenantId: string,
    to: RehearsalShard,
  ): Promise<{
    readonly ref: TenantMoveRef;
    readonly verification: TenantMoveVerification;
  }> {
    return this.moveWith(this.started(), tenantId, to);
  }

  private async moveWith(
    moves: TenantMoves,
    tenantId: string,
    to: RehearsalShard,
  ): Promise<{
    readonly ref: TenantMoveRef;
    readonly verification: TenantMoveVerification;
  }> {
    const ref = this.refTo(tenantId, to);
    await PendingRounds.untilDone(() => moves.sync(ref));
    const verification = await PendingRounds.untilDone(() =>
      moves.finalize(ref),
    );
    await moves.switch(ref);
    return { ref, verification };
  }

  /** A new move of the tenant to the given shard, without running it. */
  refTo(tenantId: string, to: RehearsalShard): TenantMoveRef {
    return {
      moveId: this.ids.next().toString(),
      tenantId,
      targetGroup: to,
      targetRegion: TenantMoveRehearsal.REGIONS[to],
    };
  }

  /** The move steps, to run them one by one. */
  steps(): TenantMoves {
    return this.started();
  }

  /** The same steps on the copy that `decorate` builds around the real one, to observe it or make it fail. */
  stepsWith(
    decorate: (transfer: TenantDataTransfer) => TenantDataTransfer,
  ): TenantMoves {
    return this.assemble(decorate(this.assembled().transfer));
  }

  async cleanup(ref: TenantMoveRef): Promise<void> {
    await PendingRounds.untilDone(() => this.started().cleanup(ref));
  }

  placement(tenantId: string): Promise<TenantPlacement> {
    return this.db.router.placement(tenantId);
  }

  /** Count and sum of the tenant rows in each manifest table, on a shard. */
  async checksums(
    shard: RehearsalShard,
    tenantId: string,
  ): Promise<ManifestChecksums> {
    const dataSource = await this.shard(shard);
    const shapes = new TableShapeReader();
    const result: Record<string, TableChecksum> = {};
    for (const entry of this.manifest.tables()) {
      result[entry.table] = await this.session.run(
        dataSource,
        tenantId,
        async (runner) =>
          new TableCopier(
            await shapes.read(runner, entry.table),
            this.filter,
          ).checksum(runner, tenantId),
      );
    }
    return result;
  }

  /** The values of a column in the tenant rows of a table, on a shard. */
  async values(
    shard: RehearsalShard,
    table: string,
    column: string,
    tenantId: string,
  ): Promise<unknown[]> {
    const rows: { value: unknown }[] = await (
      await this.shard(shard)
    ).query(
      `SELECT t."${column}" AS value FROM "${table}" t WHERE ${this.filter.where(table, 't')}`,
      [tenantId],
    );
    return rows.map((row) => row.value);
  }

  shard(shard: RehearsalShard): Promise<DataSource> {
    return this.db.sources.get({
      logicalShard: shard,
      instance: ShardedTestDatabase.INSTANCE,
    });
  }

  private assembled(): RehearsalParts {
    if (this.parts === undefined) {
      throw new Error('TenantMoveRehearsal.start() was not called');
    }
    return this.parts;
  }

  private batchTransfer(options: BatchTransferOptions): TenantDataTransfer {
    return new BatchTenantDataTransfer(
      this.manifest,
      this.connections(),
      new SystemClock(),
      options,
    );
  }

  private assemble(transfer: TenantDataTransfer): TenantMoves {
    const parts = this.assembled();
    return new TenantMoves(
      parts.shards,
      transfer,
      parts.gate,
      new ShardTenantMoveFence(this.fence, this.connections()),
      parts.transition,
      this.db.lister,
      new OpenSagaActivity(this.connections()),
    );
  }

  private connections(): PooledShardConnections {
    return new PooledShardConnections(this.db.sources);
  }

  private started(): TenantMoves {
    if (this.moves === undefined) {
      throw new Error('TenantMoveRehearsal.start() was not called');
    }
    return this.moves;
  }

  private static sidesOf(verification: TenantMoveVerification): {
    readonly source: ManifestChecksums;
    readonly target: ManifestChecksums;
  } {
    return {
      source: Object.fromEntries(
        verification.tables.map((check) => [
          check.table,
          { rows: check.sourceRows, checksum: check.sourceChecksum },
        ]),
      ),
      target: Object.fromEntries(
        verification.tables.map((check) => [
          check.table,
          { rows: check.targetRows, checksum: check.targetChecksum },
        ]),
      ),
    };
  }

  private static rowsOf(checksums: ManifestChecksums): ManifestRows {
    return Object.fromEntries(
      Object.entries(checksums).map(([table, checksum]) => [
        table,
        checksum.rows,
      ]),
    );
  }

  private async rehearseWrites(
    rowsPerTable: number,
    inserts: boolean,
    copy: RehearsalCopy,
    writesPerWriter: number,
  ): Promise<WritesRehearsalReport> {
    const tenantId = this.ids.next().toString();
    await this.seed(tenantId, RehearsalShard.A, rowsPerTable);
    const source = await this.shard(RehearsalShard.A);
    const writers = Array.from(
      { length: 2 },
      () =>
        new ManifestRowWriter(
          source,
          tenantId,
          this.manifest,
          this.filter,
          this.seeder,
          inserts,
        ),
    );
    let writing = true;
    const running = writers.map(async (writer) => {
      for (
        let writes = 0;
        writing && writes < writesPerWriter && (await writer.writeOnce());
        writes += 1
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, TenantMoveRehearsal.WRITE_PAUSE_MS),
        );
      }
    });
    try {
      const { verification } = await this.moveWith(
        this.assemble(copy.transfer),
        tenantId,
        RehearsalShard.B,
      );
      return {
        verified: verification.verified,
        verifiedSource: TenantMoveRehearsal.sidesOf(verification).source,
        verifiedTarget: TenantMoveRehearsal.sidesOf(verification).target,
        sourceAfterSwitch: await this.checksums(RehearsalShard.A, tenantId),
        acked: writers.reduce((sum, writer) => sum + writer.acked(), 0),
        rejected: writers.reduce((sum, writer) => sum + writer.rejected(), 0),
        copyBatchSize: copy.options.batchSize,
      };
    } finally {
      writing = false;
      await Promise.all(running);
    }
  }
}
