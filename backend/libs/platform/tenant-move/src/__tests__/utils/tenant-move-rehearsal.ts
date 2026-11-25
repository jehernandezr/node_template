import type {
  TenantMoveRef,
  TenantMoveVerification,
} from '@contracts/platform';
import { SystemClock, UuidV7IdGenerator } from '@platform/kernel';
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

/** Los dos shards del ensayo. */
export enum RehearsalShard {
  A = 'test_shard_0',
  B = 'test_shard_1',
}

/** Opciones de {@link TenantMoveRehearsal}. */
export interface TenantMoveRehearsalOptions {
  readonly manifest: TenantMoveManifest;
  /** Migraciones de cada shard: las de la plataforma y las del servicio. */
  readonly shardMigrations: readonly MigrationClass[];
  readonly fixedColumns?: FixedColumns;
  /** Imagen de PostgreSQL, para los servicios que necesitan pgvector. */
  readonly image?: string;
  /** Extensiones que el aprovisionamiento crea en cada shard antes de migrar. */
  readonly extensions?: readonly string[];
  /** Filas por lote; uno chico hace que cada tabla se copie en varios lotes. */
  readonly batchSize?: number;
}

/** Las piezas de `TenantMoves` que el ensayo arma una vez y comparte entre sus variantes. */
interface RehearsalParts {
  readonly shards: TenantMoveShards;
  readonly transfer: TenantDataTransfer;
  readonly gate: DirectoryWriteGate;
  readonly transition: PlacementTransition;
}

/** Conteo y suma de cada tabla del manifiesto. */
export type ManifestChecksums = Readonly<Record<string, TableChecksum>>;

/** Filas de cada tabla del manifiesto. */
export type ManifestRows = Readonly<Record<string, number>>;

/** Lo que deja un ensayo completo: un tenant sembrado en A, trasladado a B y limpiado de A, con un vecino en A. */
export interface RehearsalReport {
  readonly tenantId: string;
  readonly seeded: ManifestChecksums;
  /** Lo que `finalize` comparó en cada lado, con el origen congelado. */
  readonly verifiedSource: ManifestChecksums;
  readonly verifiedTarget: ManifestChecksums;
  readonly verified: boolean;
  readonly movedRows: ManifestRows;
  readonly leftInSource: ManifestRows;
  readonly neighbourBefore: ManifestChecksums;
  readonly neighbourAfter: ManifestChecksums;
}

/**
 * Ensayo de traslados de un servicio sobre sus migraciones reales: un PostgreSQL con dos shards y `TenantMoves`
 * cableado sin NestJS, con el directorio en memoria y la barrera en los shards. Cada shard es un grupo de destino con
 * su propia región, así cada traslado cambia de shard y de región.
 */
export class TenantMoveRehearsal {
  static readonly REGIONS: Readonly<Record<RehearsalShard, string>> = {
    [RehearsalShard.A]: 'rehearsal-a',
    [RehearsalShard.B]: 'rehearsal-b',
  };

  /** Las sagas sembradas ya terminaron: una abierta frenaría el traslado. */
  private static readonly SETTLED_SAGAS: FixedColumns = {
    [PlatformTenantMoveManifest.SAGA_INSTANCES]: {
      status: () => SagaStatus.Completed,
    },
  };

  readonly fence = new TenantWriteFence();
  /** El manifiesto del servicio con las tablas de la plataforma, como lo copia el módulo. */
  readonly manifest: TenantMoveManifest;
  readonly db: ShardedTestDatabase;
  private readonly ids = new UuidV7IdGenerator();
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
   * Siembra un tenant y un vecino en A, traslada el tenant a B mientras el vecino se queda y limpia A. Con el informe
   * se comprueba que cada tabla llegó entera y sin cambios, que el origen quedó vacío y que el vecino no se tocó.
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

  /** Las mismas filas en cada tabla del manifiesto, para comparar con un informe. */
  everyTable(rows: number): ManifestRows {
    return Object.fromEntries(
      this.manifest.tables().map((entry) => [entry.table, rows]),
    );
  }

  /** Ubica un tenant nuevo en el shard dado, con la región de ese shard. */
  place(tenantId: string, shard: RehearsalShard): void {
    this.db.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(tenantId)
        .withRegion(TenantMoveRehearsal.REGIONS[shard])
        .withShardGroup(shard)
        .build(),
    );
  }

  /** Ubica el tenant en el shard y siembra sus filas en cada tabla del manifiesto. */
  async seed(
    tenantId: string,
    shard: RehearsalShard,
    rowsPerTable = 2,
  ): Promise<void> {
    this.place(tenantId, shard);
    await this.seeder.seed(await this.shard(shard), tenantId, rowsPerTable);
  }

  /** Corre el traslado completo hasta `switch`, repitiendo cada paso mientras su ronda no termina, como la saga. */
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

  /** Un traslado nuevo del tenant al shard dado, sin correrlo. */
  refTo(tenantId: string, to: RehearsalShard): TenantMoveRef {
    return {
      moveId: this.ids.next().toString(),
      tenantId,
      targetGroup: to,
      targetRegion: TenantMoveRehearsal.REGIONS[to],
    };
  }

  /** Los pasos del traslado, para correrlos uno a uno. */
  steps(): TenantMoves {
    return this.started();
  }

  /** Los mismos pasos sobre la copia que arma `decorate` alrededor de la real, para observarla o hacerla fallar. */
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

  /** Conteo y suma de las filas del tenant en cada tabla del manifiesto, en un shard. */
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

  /** Los valores de una columna en las filas del tenant de una tabla, en un shard. */
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
