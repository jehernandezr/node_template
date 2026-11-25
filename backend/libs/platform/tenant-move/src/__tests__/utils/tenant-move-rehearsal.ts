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
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import {
  DirectoryWriteGate,
  PlacementTransition,
  type TenantPlacement,
} from '@platform/sharding';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import type { DataSource } from 'typeorm';
import { OpenSagaActivity } from '../../activity/open-saga-activity.js';
import { TenantMoveShards } from '../../application/tenant-move-shards.js';
import { TenantMoves } from '../../application/tenant-moves.js';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { MergedTenantMoveManifest } from '../../manifest/merged-tenant-move-manifest.js';
import { PlatformTenantMoveManifest } from '../../manifest/platform-tenant-move-manifest.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { TenantMoveTargets } from '../../targets/tenant-move-targets.js';
import { BatchTenantDataTransfer } from '../../transfer/batch/batch-tenant-data-transfer.js';
import type { TableChecksum } from '../../transfer/batch/table-checksum.js';
import { TableCopier } from '../../transfer/batch/table-copier.js';
import type { TenantDataTransfer } from '../../transfer/tenant-data-transfer.js';
import { TableShapeReader } from '../../transfer/batch/table-shape-reader.js';
import { TenantRowFilter } from '../../transfer/batch/tenant-row-filter.js';
import { TenantSession } from '../../transfer/batch/tenant-session.js';
import { ManifestRowSeeder, type FixedColumns } from './manifest-row-seeder.js';

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
  /** PostgreSQL image, for services that need pgvector. */
  readonly image?: string;
  /** Extensions that provisioning creates in each shard before migrating. */
  readonly extensions?: readonly string[];
  /** Rows per batch; a small one makes each table get copied in several batches. */
  readonly batchSize?: number;
}

/** The `TenantMoves` parts the rehearsal builds once and shares across its variants. */
interface RehearsalParts {
  readonly shards: TenantMoveShards;
  readonly transfer: TenantDataTransfer;
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

/**
 * Move rehearsal of a service on its real migrations: a PostgreSQL with two shards and `TenantMoves`
 * wired without NestJS, with the directory in memory and the fence in the shards. Each shard is a target group with
 * its own region, so each move changes shard and region.
 */
export class TenantMoveRehearsal {
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
  private moves: TenantMoves | undefined;
  private parts: RehearsalParts | undefined;

  constructor(private readonly options: TenantMoveRehearsalOptions) {
    this.db = new ShardedTestDatabase({
      shard: {
        entities: [],
        migrations: [
          ...options.shardMigrations,
          ...platformSagaShardMigrations,
        ],
      },
      catalog: { entities: [], migrations: [] },
      image: options.image,
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
  }

  async start(): Promise<void> {
    await this.db.start();
    for (const shard of Object.values(RehearsalShard)) {
      for (const extension of this.options.extensions ?? []) {
        await (
          await this.shard(shard)
        ).query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
      }
    }
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
      shards: new TenantMoveShards(
        this.db.router,
        this.db.directory,
        this.db.sources,
        targets,
      ),
      transfer: new BatchTenantDataTransfer(this.manifest, new SystemClock(), {
        batchSize: this.options.batchSize ?? 500,
        callBudgetMs: 4_000,
        deltaMarginMs: 60_000,
        caughtUpRows: 0,
      }),
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
      verifiedSource: Object.fromEntries(
        verification.tables.map((check) => [
          check.table,
          { rows: check.sourceRows, checksum: check.sourceChecksum },
        ]),
      ),
      verifiedTarget: Object.fromEntries(
        verification.tables.map((check) => [
          check.table,
          { rows: check.targetRows, checksum: check.targetChecksum },
        ]),
      ),
      verified: verification.verified,
      movedRows,
      leftInSource: TenantMoveRehearsal.rowsOf(
        await this.checksums(RehearsalShard.A, tenantId),
      ),
      neighbourBefore,
      neighbourAfter: await this.checksums(RehearsalShard.A, neighbour),
    };
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
    const moves = this.started();
    const ref = this.refTo(tenantId, to);
    await TenantMoveRehearsal.untilDone(() => moves.sync(ref));
    const verification = await TenantMoveRehearsal.untilDone(() =>
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
    if (this.parts === undefined) {
      throw new Error('TenantMoveRehearsal.start() was not called');
    }
    return this.assemble(decorate(this.parts.transfer));
  }

  async cleanup(ref: TenantMoveRef): Promise<void> {
    await TenantMoveRehearsal.untilDone(() => this.started().cleanup(ref));
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

  private assemble(transfer: TenantDataTransfer): TenantMoves {
    const parts = this.parts;
    if (parts === undefined) {
      throw new Error('TenantMoveRehearsal.start() was not called');
    }
    return new TenantMoves(
      parts.shards,
      transfer,
      parts.gate,
      this.fence,
      parts.transition,
      this.db.lister,
      this.db.sources,
      new OpenSagaActivity(),
    );
  }

  private started(): TenantMoves {
    if (this.moves === undefined) {
      throw new Error('TenantMoveRehearsal.start() was not called');
    }
    return this.moves;
  }

  private static rowsOf(checksums: ManifestChecksums): ManifestRows {
    return Object.fromEntries(
      Object.entries(checksums).map(([table, checksum]) => [
        table,
        checksum.rows,
      ]),
    );
  }

  private static async untilDone<T>(step: () => Promise<T>): Promise<T> {
    for (;;) {
      try {
        return await step();
      } catch (error) {
        if (
          (error as { code?: unknown }).code !==
          TenantMoveErrorCode.RoundPending
        ) {
          throw error;
        }
      }
    }
  }
}
