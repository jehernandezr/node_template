import { PlatformErrorCode } from '@contracts/platform';
import { SystemClock, type Clock, type IdGenerator } from '@platform/kernel';
import {
  DataAccess,
  invalidConfiguration,
  PersistenceError,
  toResolver,
  type Database,
  type DatabaseResolver,
  type SqlSession,
} from '@platform/persistence';
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

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Fila que devuelve el `INSERT … ON CONFLICT` de `claim`. */
interface ClaimedRow {
  readonly claim_token: string | null;
  readonly fingerprint: string;
  readonly attempt: number;
}

interface StoredRow {
  readonly state: string;
  readonly fingerprint: string;
  readonly lease_until: Date | string | null;
  readonly result: unknown;
}

function toMs(value: Date | string | null): number {
  const ms = value === null ? Number.NaN : new Date(value).getTime();
  if (Number.isNaN(ms)) {
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
 * - `claim` toma la llave en una sola sentencia: inserta la fila o, si existe
 *   en curso con el lease vencido, la retoma con un token nuevo (el anterior
 *   deja de valer). Solo si no tomó nada lee el estado guardado.
 * - `complete` y `release` solo aceptan el token vigente. Corren en la unidad
 *   de trabajo abierta si la hay, así el resultado se guarda en la misma
 *   transacción que los efectos.
 * - El token es un UUIDv7 del `IdGenerator`; los instantes, `timestamptz` del
 *   `Clock`. El puerto los expone en milisegundos epoch.
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
    this.databases = toResolver(options.databases);
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
          this.clock.now(),
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

  /** Borra resultados completados antes de `before`. Para el job de retención. Devuelve cuántos borró. */
  async purgeCompleted(before: Date): Promise<number> {
    const database = await this.databases.resolve(DataAccess.Write);
    const deleted = await database.write((session) =>
      session.query(
        `DELETE FROM ${this.table} WHERE state = $1 AND updated_at < $2`,
        [ClaimState.Completed, before],
      ),
    );
    return deleted.rowCount;
  }

  private async claimIn(
    session: SqlSession,
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<R>> {
    const now = this.clock.now();
    if (request.deadline.atMs <= now.getTime()) {
      // Sin tiempo para correr la operación solo sirve un resultado ya guardado.
      const live = await this.readLive(session, key, now.getTime());
      if (live !== undefined) {
        return live;
      }
      throw new DeadlineExceededError(request.deadline.atMs);
    }
    const claimToken = this.ids.next().toString();
    const leaseUntil = computeLeaseUntil(request, now.getTime());
    const claimed = await session.query<ClaimedRow>(
      `INSERT INTO ${this.table} (key, state, fingerprint, claim_token, lease_until, attempt, created_at, updated_at) ` +
        'VALUES ($1, $2, $3, $4, $5, 1, $6, $6) ' +
        `ON CONFLICT (key) DO UPDATE SET claim_token = EXCLUDED.claim_token, lease_until = EXCLUDED.lease_until, ` +
        `attempt = ${this.table}.attempt + 1, updated_at = EXCLUDED.updated_at ` +
        `WHERE ${this.table}.state = $2 AND ${this.table}.lease_until <= EXCLUDED.updated_at ` +
        'RETURNING claim_token, fingerprint, attempt',
      [
        key,
        ClaimState.InProgress,
        request.fingerprint,
        claimToken,
        new Date(leaseUntil),
        now,
      ],
    );
    // Postgres no devuelve fila si el WHERE del conflicto no se cumple; otros
    // motores devuelven la guardada. El token propio dice si se tomó la llave.
    const row = claimed.rows[0];
    if (row !== undefined && row.claim_token === claimToken) {
      return {
        state: ClaimState.Acquired,
        claimToken,
        leaseUntil,
        fingerprint: row.fingerprint,
        takeover: Number(row.attempt) > 1,
      };
    }
    const live = await this.readLive(session, key, now.getTime());
    if (live !== undefined) {
      return live;
    }
    // La fila se liberó o venció entre las dos sentencias: quien llama reintenta.
    throw new PersistenceError(
      PlatformErrorCode.PersistenceContention,
      'Idempotency key changed while claiming it',
    );
  }

  /** Estado completado o en curso con lease vigente; undefined si la llave está libre o vencida. */
  private async readLive(
    session: SqlSession,
    key: string,
    nowMs: number,
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
    return leaseUntil > nowMs
      ? {
          state: ClaimState.InProgress,
          leaseUntil,
          fingerprint: row.fingerprint,
        }
      : undefined;
  }
}
