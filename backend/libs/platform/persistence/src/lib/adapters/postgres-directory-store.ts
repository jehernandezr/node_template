import { PlatformErrorCode } from '@contracts/platform';
import { SystemClock, type Clock } from '@platform/kernel';
import {
  DirectoryWriteResult,
  ShardingError,
  ShardingErrorCode,
  TenantStatus,
  type DirectoryStore,
  type DirectoryWriter,
  type TenantPlacement,
} from '@platform/sharding';
import type { Database } from '../database.js';
import { invalidConfiguration, PersistenceError } from '../errors.js';
import type { SqlSession } from '../sql/sql-session.js';

/** Opciones de {@link PostgresDirectoryStore}. */
export interface PostgresDirectoryStoreOptions {
  /** Base del catálogo global. Conviene declararla `global: true`. */
  readonly catalog: Database;
  readonly clock?: Clock;
  /**
   * Lee del primario del catálogo en lugar de la réplica. Útil en la región
   * principal y en las sagas de traslado, que no toleran el retraso de réplica.
   */
  readonly readPrimary?: boolean;
}

interface PlacementRow {
  readonly tenant_id: string;
  readonly region: string;
  readonly shard_group: unknown;
  readonly status: string;
  readonly version: unknown;
  readonly dedicated: unknown;
}

/** Intentos de escritura condicional cuando otro proceso inserta la misma fila a la vez. */
const MAX_WRITE_ROUNDS = 3;

const STATUSES = new Set<string>(Object.values(TenantStatus));

function corrupt(): PersistenceError {
  return new PersistenceError(
    PlatformErrorCode.PersistenceCorruptRow,
    'Shard directory row has an invalid shape',
  );
}

function toPlacement(row: PlacementRow): TenantPlacement {
  const version = Number(row.version);
  const group = row.shard_group;
  if (
    !Array.isArray(group) ||
    group.length === 0 ||
    !group.every((shard) => typeof shard === 'string' && shard.length > 0) ||
    !STATUSES.has(row.status) ||
    !Number.isSafeInteger(version) ||
    version < 0 ||
    typeof row.dedicated !== 'boolean'
  ) {
    throw corrupt();
  }
  return {
    tenantId: row.tenant_id,
    region: row.region,
    shardGroup: [...(group as string[])],
    status: row.status as TenantStatus,
    version,
    dedicated: row.dedicated,
  };
}

function assertPlacement(placement: TenantPlacement): void {
  const { tenantId, region, shardGroup, status, version, dedicated } =
    placement;
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw invalidConfiguration('placement.tenantId', 'a non-empty string');
  }
  if (typeof region !== 'string' || region.length === 0) {
    throw invalidConfiguration('placement.region', 'a non-empty string');
  }
  if (
    !Array.isArray(shardGroup) ||
    shardGroup.length === 0 ||
    !shardGroup.every((shard) => typeof shard === 'string' && shard.length > 0)
  ) {
    throw invalidConfiguration(
      'placement.shardGroup',
      'a non-empty list of shard ids',
    );
  }
  if (!STATUSES.has(status)) {
    throw invalidConfiguration('placement.status', 'a TenantStatus');
  }
  if (!Number.isSafeInteger(version) || version < 0) {
    throw invalidConfiguration('placement.version', 'a non-negative integer');
  }
  if (typeof dedicated !== 'boolean') {
    throw invalidConfiguration('placement.dedicated', 'a boolean');
  }
}

/**
 * Adaptador Postgres del `DirectoryStore` y el `DirectoryWriter` de
 * `@platform/sharding`, sobre las tablas `shard_directory`, `shard_instances` y
 * `shard_locks` del catálogo.
 *
 * `putPlacement` es la escritura de las sagas de alta y traslado: compare-and-set
 * por versión y exclusividad de shards en una sola transacción. Primero toma con
 * `SELECT … FOR UPDATE` la fila de cada shard destino en `shard_locks` (creándola
 * si falta, en orden para evitar interbloqueos) y la del tenant; con los candados
 * puestos relee el directorio y comprueba versión y exclusividad. Dos altas
 * dedicadas sobre el mismo shard vacío se serializan y la segunda recibe
 * `ShardTaken`.
 *
 * `setPlacementIfNewer` es la escritura simple por versión (sin exclusividad):
 * conviene a réplicas y cachés. Sus escrituras son condicionales por versión, con la misma semántica que
 * `RoutingCache.setIfNewer`: `setPlacementIfNewer` solo escribe si no hay fila
 * o si la versión guardada es menor; una versión igual se rechaza. Cada
 * sentencia es atómica: el `UPDATE … WHERE version < $v` reevalúa la condición
 * sobre la última versión confirmada, así dos traslados concurrentes nunca
 * dejan la versión vieja encima de la nueva. Quien escribe después llama a
 * `ShardRouter.invalidate(tenantId, { version })`.
 */
export class PostgresDirectoryStore implements DirectoryStore, DirectoryWriter {
  private readonly catalog: Database;
  private readonly clock: Clock;
  private readonly readPrimary: boolean;

  constructor(options: PostgresDirectoryStoreOptions) {
    this.catalog = options.catalog;
    this.clock = options.clock ?? new SystemClock();
    this.readPrimary = options.readPrimary ?? false;
  }

  async getPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    const result = await this.read((session) =>
      session.query<PlacementRow>(
        'SELECT tenant_id, region, shard_group, status, version, dedicated FROM shard_directory WHERE tenant_id = $1',
        [tenantId],
      ),
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toPlacement(row);
  }

  async getInstance(logicalShard: string): Promise<string | undefined> {
    const result = await this.read((session) =>
      session.query<{ instance: string }>(
        'SELECT instance FROM shard_instances WHERE logical_shard = $1',
        [logicalShard],
      ),
    );
    return result.rows[0]?.instance;
  }

  async listPlacements(region: string): Promise<readonly TenantPlacement[]> {
    if (typeof region !== 'string' || region.length === 0) {
      throw invalidConfiguration('region', 'a non-empty string');
    }
    // Siempre del primario: la política de ubicación no tolera datos atrasados.
    const result = await this.catalog.readPrimary((session) =>
      session.query<PlacementRow>(
        'SELECT tenant_id, region, shard_group, status, version, dedicated FROM shard_directory WHERE region = $1 ORDER BY tenant_id',
        [region],
      ),
    );
    return result.rows.map(toPlacement);
  }

  /**
   * @throws ShardingError `InvalidConfiguration` cuando la versión nueva no es
   *   `expectedVersion + 1` (o 1 para un tenant nuevo), igual que el directorio en memoria.
   */
  async putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult> {
    assertPlacement(placement);
    if (
      expectedVersion !== undefined &&
      (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    ) {
      throw invalidConfiguration(
        'expectedVersion',
        'a non-negative integer or undefined',
      );
    }
    if (placement.version !== (expectedVersion ?? 0) + 1) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'placement.version must be expectedVersion + 1, or 1 for a new tenant',
        { details: { option: 'version' } },
      );
    }
    return this.catalog.write(async (session) => {
      await this.lockShards(session, placement.shardGroup);
      const stored = await session.query<{ version: unknown }>(
        'SELECT version FROM shard_directory WHERE tenant_id = $1 FOR UPDATE',
        [placement.tenantId],
      );
      const storedVersion =
        stored.rows[0] === undefined
          ? undefined
          : Number(stored.rows[0].version);
      if (storedVersion !== expectedVersion) {
        return DirectoryWriteResult.VersionConflict;
      }
      const taken = await session.query(
        'SELECT 1 AS taken FROM shard_directory WHERE tenant_id <> $1 AND shard_group && $2::text[] AND (dedicated OR $3::boolean) LIMIT 1',
        [placement.tenantId, [...placement.shardGroup], placement.dedicated],
      );
      if (taken.rows.length > 0) {
        return DirectoryWriteResult.ShardTaken;
      }
      const values = [
        placement.tenantId,
        placement.region,
        [...placement.shardGroup],
        placement.status,
        placement.version,
        placement.dedicated,
        this.clock.now(),
      ];
      const written =
        expectedVersion === undefined
          ? await session.query(
              'INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id) DO NOTHING',
              values,
            )
          : await session.query(
              'UPDATE shard_directory SET region = $2, shard_group = $3, status = $4, version = $5, dedicated = $6, updated_at = $7 ' +
                'WHERE tenant_id = $1 AND version = $8',
              [...values, expectedVersion],
            );
      return written.rowCount > 0
        ? DirectoryWriteResult.Written
        : DirectoryWriteResult.VersionConflict;
    });
  }

  /** Shards lógicos registrados, ordenados por id. */
  async listShards(): Promise<string[]> {
    const result = await this.read((session) =>
      session.query<{ logical_shard: string }>(
        'SELECT logical_shard FROM shard_instances ORDER BY logical_shard',
      ),
    );
    return result.rows.map((row) => row.logical_shard);
  }

  /**
   * Escribe la ubicación si es nueva o su versión es mayor que la guardada.
   * Devuelve `true` si escribió.
   */
  async setPlacementIfNewer(placement: TenantPlacement): Promise<boolean> {
    assertPlacement(placement);
    return this.catalog.write((session) =>
      this.writePlacement(session, placement),
    );
  }

  /** Registra o mueve un shard lógico a una instancia física. */
  async setInstance(logicalShard: string, instance: string): Promise<void> {
    if (typeof logicalShard !== 'string' || logicalShard.length === 0) {
      throw invalidConfiguration('logicalShard', 'a non-empty string');
    }
    if (typeof instance !== 'string' || instance.length === 0) {
      throw invalidConfiguration('instance', 'a non-empty string');
    }
    await this.catalog.write((session) =>
      session.query(
        'INSERT INTO shard_instances (logical_shard, instance, updated_at) VALUES ($1, $2, $3) ' +
          'ON CONFLICT (logical_shard) DO UPDATE SET instance = EXCLUDED.instance, updated_at = EXCLUDED.updated_at',
        [logicalShard, instance, this.clock.now()],
      ),
    );
  }

  /** Toma el candado de cada shard, en orden y sin repetidos, hasta el fin de la transacción. */
  private async lockShards(
    session: SqlSession,
    shards: readonly string[],
  ): Promise<void> {
    const ordered = [...new Set(shards)].sort();
    for (const shard of ordered) {
      await session.query(
        'INSERT INTO shard_locks (logical_shard) VALUES ($1) ON CONFLICT (logical_shard) DO NOTHING',
        [shard],
      );
    }
    await session.query(
      'SELECT logical_shard FROM shard_locks WHERE logical_shard = ANY($1::text[]) ORDER BY logical_shard FOR UPDATE',
      [ordered],
    );
  }

  private read<T>(fn: (session: SqlSession) => Promise<T>): Promise<T> {
    return this.readPrimary
      ? this.catalog.readPrimary(fn)
      : this.catalog.read(fn);
  }

  private async writePlacement(
    session: SqlSession,
    placement: TenantPlacement,
  ): Promise<boolean> {
    const values = [
      placement.tenantId,
      placement.region,
      [...placement.shardGroup],
      placement.status,
      placement.version,
      placement.dedicated,
      this.clock.now(),
    ];
    for (let round = 0; round < MAX_WRITE_ROUNDS; round += 1) {
      const updated = await session.query(
        'UPDATE shard_directory SET region = $2, shard_group = $3, status = $4, version = $5, dedicated = $6, updated_at = $7 ' +
          'WHERE tenant_id = $1 AND version < $5',
        values,
      );
      if (updated.rowCount > 0) {
        return true;
      }
      const inserted = await session.query(
        'INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) ' +
          'SELECT $1::text, $2::text, $3::text[], $4::text, $5::bigint, $6::boolean, $7::timestamptz WHERE NOT EXISTS (SELECT 1 FROM shard_directory WHERE tenant_id = $1) ' +
          'ON CONFLICT (tenant_id) DO NOTHING',
        values,
      );
      if (inserted.rowCount > 0) {
        return true;
      }
      const existing = await session.query<{ version: unknown }>(
        'SELECT version FROM shard_directory WHERE tenant_id = $1',
        [placement.tenantId],
      );
      const stored = existing.rows[0];
      if (stored !== undefined && Number(stored.version) >= placement.version) {
        return false;
      }
      // La fila cambió entre sentencias (se borró o bajó de versión): se reintenta.
    }
    throw new PersistenceError(
      PlatformErrorCode.PersistenceContention,
      'Shard directory row kept changing while writing it',
      { details: { rounds: MAX_WRITE_ROUNDS } },
    );
  }
}
