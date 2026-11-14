import { PlatformErrorCode } from '@contracts/platform';
import { SystemClock, type Clock, type IdGenerator } from '@platform/kernel';
import {
  assertClaimInput,
  ClaimState,
  computeLeaseUntil,
  DeadlineExceededError,
  StaleClaimError,
  type ClaimRequest,
  type ClaimResult,
  type IdempotencyStore,
} from '@platform/primitives';
import type { Database } from '../database.js';
import { DataAccess } from '../enums.js';
import { invalidConfiguration, PersistenceError } from '../errors.js';
import type { DatabaseResolver } from '../sharding/database-resolver.js';
import { SingleDatabaseResolver } from '../sharding/database-resolver.js';
import type { SqlSession } from '../sql/sql-session.js';

/** Opciones de {@link PostgresIdempotencyStore}. */
export interface PostgresIdempotencyStoreOptions<R> {
  /** La base del servicio o el resolver de shards: la llave vive con los efectos. */
  readonly databases: Database | DatabaseResolver;
  readonly ids: IdGenerator;
  readonly clock?: Clock;
  /** Tabla. Por defecto `idempotency_keys` (migración `PlatformIdempotencyKeys`). */
  readonly table?: string;
  /** Convierte el resultado a JSON. Por defecto lo guarda tal cual en `jsonb`. */
  readonly serialize?: (result: R) => unknown;
  /** Reconstruye el resultado desde el `jsonb` guardado. */
  readonly deserialize?: (stored: unknown) => R;
}

/** Intentos de claim cuando otro proceso cambia la fila entre sentencias. */
const MAX_CLAIM_ROUNDS = 5;

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface StoredRow {
  readonly state: string;
  readonly fingerprint: string;
  readonly lease_until: unknown;
  readonly result: unknown;
}

function toMs(value: unknown): number {
  const ms = Number(value);
  if (!Number.isSafeInteger(ms)) {
    throw new PersistenceError(
      PlatformErrorCode.PersistenceCorruptRow,
      'Idempotency row has an invalid lease',
    );
  }
  return ms;
}

/**
 * Adaptador Postgres del puerto `IdempotencyStore` de `@platform/primitives`,
 * con los mismos tres estados y el mismo fencing que el adaptador en memoria.
 *
 * - `claim` es atómico por llave sin bloquear filas: primero intenta tomar un
 *   lease vencido con un `UPDATE` condicional, luego insertar con
 *   `ON CONFLICT DO NOTHING`, y si ambos fallan lee el estado. Si la fila cambió
 *   entre sentencias (otro proceso la liberó o la venció), repite.
 * - `complete` y `release` solo aceptan el token vigente. Corren en la unidad
 *   de trabajo abierta si la hay, así el resultado se guarda en la misma
 *   transacción que los efectos.
 * - El token es un UUIDv7 del `IdGenerator`; los instantes, milisegundos del `Clock`.
 */
export class PostgresIdempotencyStore<
  R = unknown,
> implements IdempotencyStore<R> {
  private readonly databases: DatabaseResolver;
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private readonly table: string;
  private readonly serialize: (result: R) => unknown;
  private readonly deserialize: (stored: unknown) => R;

  constructor(options: PostgresIdempotencyStoreOptions<R>) {
    this.databases =
      'resolve' in options.databases
        ? options.databases
        : new SingleDatabaseResolver(options.databases);
    this.ids = options.ids;
    this.clock = options.clock ?? new SystemClock();
    this.table = options.table ?? 'idempotency_keys';
    if (!TABLE_NAME.test(this.table)) {
      throw invalidConfiguration('table', 'a plain SQL identifier');
    }
    this.serialize = options.serialize ?? ((result: R): unknown => result);
    this.deserialize =
      options.deserialize ?? ((stored: unknown): R => stored as R);
  }

  async claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>> {
    assertClaimInput(key, request.fingerprint);
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write((session) => this.claimIn(session, key, request));
  }

  async complete(key: string, claimToken: string, result: R): Promise<void> {
    const database = await this.databases.resolve(DataAccess.Write);
    const stored = JSON.stringify(this.serialize(result) ?? null);
    const updated = await database.write((session) =>
      session.query(
        `UPDATE ${this.table} SET state = $3, result = $4::jsonb, claim_token = NULL, lease_until = NULL, updated_at = $5 ` +
          'WHERE key = $1 AND state = $6 AND claim_token = $2',
        [
          key,
          claimToken,
          ClaimState.Completed,
          stored,
          this.now(),
          ClaimState.InProgress,
        ],
      ),
    );
    if (updated.rowCount === 0) {
      throw new StaleClaimError('complete');
    }
  }

  async release(key: string, claimToken: string): Promise<void> {
    const database = await this.databases.resolve(DataAccess.Write);
    const deleted = await database.write((session) =>
      session.query(
        `DELETE FROM ${this.table} WHERE key = $1 AND state = $3 AND claim_token = $2`,
        [key, claimToken, ClaimState.InProgress],
      ),
    );
    if (deleted.rowCount === 0) {
      throw new StaleClaimError('release');
    }
  }

  /**
   * Borra resultados completados antes de `beforeMs` (milisegundos epoch).
   * Para el job de retención. Devuelve cuántos borró.
   */
  async purgeCompleted(beforeMs: number): Promise<number> {
    const database = await this.databases.resolve(DataAccess.Write);
    const deleted = await database.write((session) =>
      session.query(
        `DELETE FROM ${this.table} WHERE state = $1 AND updated_at < $2`,
        [ClaimState.Completed, beforeMs],
      ),
    );
    return deleted.rowCount;
  }

  private async claimIn(
    session: SqlSession,
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<R>> {
    for (let round = 0; round < MAX_CLAIM_ROUNDS; round += 1) {
      const now = this.now();
      const live = await this.readLive(session, key, now);
      if (live !== undefined) {
        return live;
      }
      if (request.deadline.atMs <= now) {
        throw new DeadlineExceededError(request.deadline.atMs);
      }
      const claimToken = this.ids.next().toString();
      const leaseUntil = computeLeaseUntil(request, now);

      // Lease vencido: se emite un token nuevo y el anterior deja de valer.
      const takeover = await session.query<{ fingerprint: string }>(
        `UPDATE ${this.table} SET claim_token = $2, lease_until = $3, attempt = attempt + 1, updated_at = $4 ` +
          'WHERE key = $1 AND state = $5 AND lease_until <= $4 RETURNING fingerprint, claim_token',
        [key, claimToken, leaseUntil, now, ClaimState.InProgress],
      );
      const taken = takeover.rows[0] as
        { fingerprint: string; claim_token: string } | undefined;
      if (taken !== undefined && taken.claim_token === claimToken) {
        return {
          state: ClaimState.Acquired,
          claimToken,
          leaseUntil,
          fingerprint: taken.fingerprint,
          takeover: true,
        };
      }

      // Llave libre: la inserta quien llegue primero.
      const inserted = await session.query<{ claim_token: string }>(
        `INSERT INTO ${this.table} (key, state, fingerprint, claim_token, lease_until, attempt, created_at, updated_at) ` +
          'VALUES ($1, $2, $3, $4, $5, 1, $6, $6) ON CONFLICT (key) DO NOTHING RETURNING claim_token',
        [
          key,
          ClaimState.InProgress,
          request.fingerprint,
          claimToken,
          leaseUntil,
          now,
        ],
      );
      if (inserted.rows[0]?.claim_token === claimToken) {
        return {
          state: ClaimState.Acquired,
          claimToken,
          leaseUntil,
          fingerprint: request.fingerprint,
          takeover: false,
        };
      }
    }
    throw new PersistenceError(
      PlatformErrorCode.PersistenceContention,
      'Idempotency key kept changing while claiming it',
      { details: { rounds: MAX_CLAIM_ROUNDS } },
    );
  }

  /** Estado completado o en curso con lease vigente; undefined si la llave está libre o vencida. */
  private async readLive(
    session: SqlSession,
    key: string,
    now: number,
  ): Promise<ClaimResult<R> | undefined> {
    const found = await session.query<StoredRow>(
      `SELECT state, fingerprint, lease_until, result FROM ${this.table} WHERE key = $1`,
      [key],
    );
    const row = found.rows[0];
    if (row === undefined) {
      return undefined;
    }
    if (row.state === ClaimState.Completed) {
      return {
        state: ClaimState.Completed,
        result: this.deserialize(row.result),
        fingerprint: row.fingerprint,
      };
    }
    if (row.state !== ClaimState.InProgress) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceCorruptRow,
        'Idempotency row has an unknown state',
      );
    }
    const leaseUntil = toMs(row.lease_until);
    return leaseUntil > now
      ? {
          state: ClaimState.InProgress,
          leaseUntil,
          fingerprint: row.fingerprint,
        }
      : undefined;
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
