import { PlatformErrorCode } from '@contracts/platform';
import { type Clock, SystemClock } from '@platform/kernel';
import {
  type ClaimOutboxRequest,
  type MessageEnvelope,
  type OutboxAppend,
  type OutboxLease,
  type OutboxRecord,
  type OutboxStore,
  type OutboxWriter,
  OutboxStatus,
} from '@platform/messaging';
import {
  DataAccess,
  type Database,
  type DatabaseResolver,
  invalidConfiguration,
  PersistenceError,
  RowLock,
  SingleDatabaseResolver,
  type SqlSession,
  type UnitOfWork,
} from '@platform/persistence';

/** Opciones de {@link PostgresOutboxStore}. */
export interface PostgresOutboxStoreOptions {
  /**
   * La base del servicio o el resolver de shards. El relay de un shard usa un
   * store por shard (o un resolver que siempre resuelva ese shard).
   */
  readonly databases: Database | DatabaseResolver;
  readonly clock?: Clock;
  /** Tabla. Por defecto `outbox` (migración `PlatformOutbox`). */
  readonly table?: string;
}

/** Opciones de {@link PostgresOutboxStore.purge}. */
export interface PurgeOutboxOptions {
  /** Borra lo terminado antes de este instante. */
  readonly before: Date;
  /** También borra los muertos. Por defecto se conservan para inspección. */
  readonly includeDead?: boolean;
}

interface OutboxRow {
  readonly id: string;
  readonly envelope: unknown;
  readonly status: string;
  readonly attempts: number;
  readonly next_attempt_at: Date | string;
  readonly created_at: Date | string;
  readonly group_id: string | null;
  readonly delay_ms: number | null;
  readonly last_error: string | null;
  readonly lease_owner: string | null;
  readonly lease_token: string | null;
  readonly lease_expires_at: Date | string | null;
}

interface Candidate {
  readonly id: string;
  readonly group_id: string | null;
  readonly created_at: Date | string;
  readonly seq: string | number;
}

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STATUSES: readonly string[] = Object.values(OutboxStatus);
const OPEN = `'${OutboxStatus.Pending}', '${OutboxStatus.Failed}'`;

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PersistenceError(
      PlatformErrorCode.PersistenceCorruptRow,
      'Outbox row has an invalid timestamp',
    );
  }
  return date;
}

/** `$from, $from+1, ...` para una lista `IN`. */
function placeholders(from: number, count: number): string {
  return Array.from({ length: count }, (_, i) => `$${from + i}`).join(', ');
}

/** `a` va antes que `b`: `created_at` y, en empate, `seq`. */
function isEarlier(a: Candidate, b: Candidate): boolean {
  const ta = toDate(a.created_at).getTime();
  const tb = toDate(b.created_at).getTime();
  return ta < tb || (ta === tb && Number(a.seq) < Number(b.seq));
}

function toRecord(row: OutboxRow): OutboxRecord {
  if (!STATUSES.includes(row.status)) {
    throw new PersistenceError(
      PlatformErrorCode.PersistenceCorruptRow,
      'Outbox row has an unknown status',
    );
  }
  return {
    id: row.id,
    envelope: row.envelope as MessageEnvelope,
    status: row.status as OutboxStatus,
    attempts: Number(row.attempts),
    nextAttemptAt: toDate(row.next_attempt_at),
    createdAt: toDate(row.created_at),
    ...(row.group_id === null ? {} : { groupId: row.group_id }),
    ...(row.delay_ms === null ? {} : { delayMs: Number(row.delay_ms) }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
    ...(row.lease_owner === null ? {} : { leaseOwner: row.lease_owner }),
    ...(row.lease_token === null ? {} : { leaseToken: row.lease_token }),
    ...(row.lease_expires_at === null
      ? {}
      : { leaseExpiresAt: toDate(row.lease_expires_at) }),
  };
}

/**
 * Adaptador Postgres de `OutboxStore` y `OutboxWriter` de `@platform/messaging`.
 *
 * - `append` inserta con la sesión de la unidad de trabajo, así el registro se
 *   confirma o se deshace con el cambio de negocio. Es idempotente por id del
 *   envelope (`ON CONFLICT DO NOTHING`).
 * - `claimPending` corre en una transacción corta: bloquea las filas vencidas con
 *   `FOR UPDATE SKIP LOCKED` (varios relays no se pisan) y les pone el lease con
 *   su token de fencing. Respeta FIFO por `groupId`: un grupo con un registro
 *   abierto anterior que no está vencido (programado o con lease ajeno), incluso
 *   uno que otro relay tiene bloqueado en ese instante, no entrega los siguientes.
 * - Las marcas (`markPublished`, `markFailed`, `markDead`, `releaseLease`) solo
 *   aplican mientras la fila conserve el lease dado; si no, devuelven `false`.
 * - El orden es `created_at` y luego `seq`. Se asume que los registros de un
 *   grupo se escriben en transacciones serializadas por el agregado.
 */
export class PostgresOutboxStore implements OutboxStore, OutboxWriter {
  private readonly databases: DatabaseResolver;
  private readonly clock: Clock;
  private readonly table: string;

  constructor(options: PostgresOutboxStoreOptions) {
    this.databases =
      'resolve' in options.databases
        ? options.databases
        : new SingleDatabaseResolver(options.databases);
    this.clock = options.clock ?? new SystemClock();
    this.table = options.table ?? 'outbox';
    if (!TABLE_NAME.test(this.table)) {
      throw invalidConfiguration('table', 'a plain SQL identifier');
    }
  }

  async append(record: OutboxAppend, uow: UnitOfWork): Promise<void> {
    await uow.session.query(
      `INSERT INTO ${this.table} (id, envelope, status, attempts, next_attempt_at, created_at, updated_at, group_id, delay_ms) ` +
        'VALUES ($1, $2::jsonb, $3, 0, $4, $4, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [
        record.envelope.id,
        JSON.stringify(record.envelope),
        OutboxStatus.Pending,
        record.createdAt,
        record.groupId ?? null,
        record.delayMs ?? null,
      ],
    );
  }

  async claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]> {
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write((session) => this.claimIn(session, request));
  }

  markPublished(id: string, lease: OutboxLease): Promise<boolean> {
    return this.mark(id, lease, { status: OutboxStatus.Published });
  }

  markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    return this.mark(id, lease, {
      status: OutboxStatus.Failed,
      error,
      nextAttemptAt,
    });
  }

  markDead(id: string, lease: OutboxLease, error: string): Promise<boolean> {
    return this.mark(id, lease, { status: OutboxStatus.Dead, error });
  }

  async releaseLease(id: string, lease: OutboxLease): Promise<boolean> {
    const database = await this.databases.resolve(DataAccess.Write);
    const result = await database.write((session) =>
      session.query(
        `UPDATE ${this.table} SET lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL, updated_at = $4 ` +
          'WHERE id = $1 AND lease_owner = $2 AND lease_token = $3',
        [id, lease.owner, lease.token, this.clock.now()],
      ),
    );
    return result.rowCount > 0;
  }

  /** Estado actual de un registro, si existe. Para diagnóstico y pruebas. */
  async get(id: string): Promise<OutboxRecord | undefined> {
    const database = await this.databases.resolve(DataAccess.Write);
    const found = await database.readPrimary((session) =>
      session.query<OutboxRow>(`SELECT * FROM ${this.table} WHERE id = $1`, [
        id,
      ]),
    );
    const row = found.rows[0];
    return row === undefined ? undefined : toRecord(row);
  }

  /**
   * Retención: borra los registros publicados (y, con `includeDead`, los muertos)
   * cuyo último cambio es anterior a `before`. Nunca toca pendientes ni fallidos.
   * Devuelve cuántos borró.
   */
  async purge(options: PurgeOutboxOptions): Promise<number> {
    const database = await this.databases.resolve(DataAccess.Write);
    const statuses =
      options.includeDead === true
        ? [OutboxStatus.Published, OutboxStatus.Dead]
        : [OutboxStatus.Published];
    const deleted = await database.write((session) =>
      session.query(
        `DELETE FROM ${this.table} WHERE status IN (${placeholders(2, statuses.length)}) AND updated_at < $1`,
        [options.before, ...statuses],
      ),
    );
    return deleted.rowCount;
  }

  private async mark(
    id: string,
    lease: OutboxLease,
    change: {
      readonly status: OutboxStatus;
      readonly error?: string;
      readonly nextAttemptAt?: Date;
    },
  ): Promise<boolean> {
    const database = await this.databases.resolve(DataAccess.Write);
    const result = await database.write((session) =>
      session.query(
        `UPDATE ${this.table} SET status = $4, attempts = attempts + 1, last_error = COALESCE($5, last_error), ` +
          'next_attempt_at = COALESCE($6, next_attempt_at), lease_owner = NULL, lease_token = NULL, ' +
          'lease_expires_at = NULL, updated_at = $7 ' +
          'WHERE id = $1 AND lease_owner = $2 AND lease_token = $3',
        [
          id,
          lease.owner,
          lease.token,
          change.status,
          change.error ?? null,
          change.nextAttemptAt ?? null,
          this.clock.now(),
        ],
      ),
    );
    return result.rowCount > 0;
  }

  private async claimIn(
    session: SqlSession,
    request: ClaimOutboxRequest,
  ): Promise<OutboxRecord[]> {
    if (request.limit <= 0) {
      return [];
    }
    // 1. Los registros abiertos que no están vencidos bloquean a los siguientes de su grupo.
    const blockers = await session.query<Candidate>(
      `SELECT id, group_id, created_at, seq FROM ${this.table} ` +
        `WHERE status IN (${OPEN}) AND group_id IS NOT NULL ` +
        'AND (next_attempt_at > $1 OR lease_expires_at > $1)',
      [request.now],
    );
    // 2. Vencidos, en orden, bloqueados sin esperar. Se pagina de a `limit` (el bloqueo
    //    cubre solo lo leído) porque los de grupos bloqueados se descartan y no deben agotar el límite.
    const picked: Candidate[] = [];
    const pageSize = request.limit;
    for (let offset = 0; picked.length < request.limit; offset += pageSize) {
      const page = await session.query<Candidate>(
        `SELECT id, group_id, created_at, seq FROM ${this.table} ` +
          `WHERE status IN (${OPEN}) AND next_attempt_at <= $1 ` +
          'AND (lease_expires_at IS NULL OR lease_expires_at <= $1) ' +
          `ORDER BY created_at, seq LIMIT $2 OFFSET $3 ${RowLock.ForUpdateSkipLocked}`,
        [request.now, pageSize, offset],
      );
      for (const row of page.rows) {
        const blocked =
          row.group_id !== null &&
          blockers.rows.some(
            (b) => b.group_id === row.group_id && isEarlier(b, row),
          );
        if (!blocked && picked.length < request.limit) {
          picked.push(row);
        }
      }
      if (page.rows.length < pageSize) {
        break;
      }
    }
    const candidates = await this.withoutSkippedPredecessors(session, picked);
    if (candidates.length === 0) {
      return [];
    }
    // 2. Lease con token nuevo. El orden del RETURNING no está garantizado: se reordena.
    const leased = await session.query<OutboxRow>(
      `UPDATE ${this.table} SET lease_owner = $1, lease_token = $2, lease_expires_at = $3, updated_at = $4 ` +
        `WHERE id IN (${placeholders(5, candidates.length)}) RETURNING *`,
      [
        request.lease.owner,
        request.lease.token,
        new Date(request.now.getTime() + request.leaseMs),
        this.clock.now(),
        ...candidates.map((c) => c.id),
      ],
    );
    const byId = new Map(leased.rows.map((row) => [row.id, row]));
    return candidates.flatMap((c) => {
      const row = byId.get(c.id);
      return row === undefined ? [] : [toRecord(row)];
    });
  }

  /**
   * Otro relay puede tener bloqueado (en su claim sin confirmar) un registro
   * anterior del grupo: `SKIP LOCKED` lo salta y su sucesor parecería libre.
   * Descarta los candidatos de un grupo que tenga un registro abierto anterior
   * fuera del conjunto bloqueado por esta transacción.
   */
  private async withoutSkippedPredecessors(
    session: SqlSession,
    candidates: readonly Candidate[],
  ): Promise<Candidate[]> {
    const groups = [
      ...new Set(
        candidates.flatMap((c) => (c.group_id === null ? [] : [c.group_id])),
      ),
    ];
    if (groups.length === 0) {
      return [...candidates];
    }
    const others = await session.query<Candidate>(
      `SELECT id, group_id, created_at, seq FROM ${this.table} ` +
        `WHERE group_id IN (${placeholders(1, groups.length)}) AND status IN (${OPEN})`,
      groups,
    );
    const mine = new Set(candidates.map((c) => c.id));
    const outside = others.rows.filter((o) => !mine.has(o.id));
    return candidates.filter(
      (c) =>
        c.group_id === null ||
        !outside.some((o) => o.group_id === c.group_id && isEarlier(o, c)),
    );
  }
}
