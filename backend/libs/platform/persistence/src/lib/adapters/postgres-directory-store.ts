import { SystemClock, type Clock } from '@platform/kernel';
import {
  TenantStatus,
  type DirectoryStore,
  type TenantPlacement,
} from '@platform/sharding';
import type { Database } from '../database.js';
import { PersistenceErrorCode } from '../enums.js';
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
    PersistenceErrorCode.CorruptRow,
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
 * Adaptador Postgres del `DirectoryStore` de `@platform/sharding`, sobre las
 * tablas `shard_directory` y `shard_instances` del catálogo.
 *
 * Las escrituras son condicionales por versión, con la misma semántica que
 * `RoutingCache.setIfNewer`: `setPlacementIfNewer` solo escribe si no hay fila
 * o si la versión guardada es menor; una versión igual se rechaza. Cada
 * sentencia es atómica: el `UPDATE … WHERE version < $v` reevalúa la condición
 * sobre la última versión confirmada, así dos traslados concurrentes nunca
 * dejan la versión vieja encima de la nueva. Quien escribe después llama a
 * `ShardRouter.invalidate(tenantId, { version })`.
 */
export class PostgresDirectoryStore implements DirectoryStore {
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
      PersistenceErrorCode.Contention,
      'Shard directory row kept changing while writing it',
      { details: { rounds: MAX_WRITE_ROUNDS } },
    );
  }
}
