import { OutboxStatus } from '@platform/messaging';
import {
  persistenceMigrations,
  type SqlMigration,
} from '@platform/persistence';
import { ClaimState } from '@platform/primitives';

/** Lista SQL de los valores de un enum, para el `CHECK` de su columna. */
function sqlValues(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

/** Estados de un claim de idempotencia, en el orden del enum. */
export const CLAIM_STATES_SQL = sqlValues(Object.values(ClaimState));

/** Estados del outbox, en el orden del enum. */
export const OUTBOX_STATUSES_SQL = sqlValues(Object.values(OutboxStatus));

/** Estados abiertos del outbox: los que el relay todavía tiene que publicar. */
export const OPEN_OUTBOX_STATUSES_SQL = sqlValues([
  OutboxStatus.Pending,
  OutboxStatus.Failed,
]);

/** Estados cerrados del outbox: los que solo esperan la retención. */
const CLOSED_OUTBOX_STATUSES_SQL = sqlValues([
  OutboxStatus.Published,
  OutboxStatus.Dead,
]);

/**
 * Tabla de claims de tres fases (`PostgresIdempotencyStore`). Los instantes son
 * `timestamptz` con el valor del `Clock` de la app, así las pruebas controlan
 * el tiempo y la tabla se lee sin conversiones.
 */
function claimTableSql(table: string): string[] {
  return [
    `CREATE TABLE ${table} (
  key text PRIMARY KEY,
  state text NOT NULL CHECK (state IN (${CLAIM_STATES_SQL})),
  fingerprint text NOT NULL,
  claim_token text,
  lease_until timestamptz,
  attempt integer NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)`,
    `CREATE INDEX ${table}_updated_idx ON ${table} (state, updated_at)`,
  ];
}

/** `idempotency_keys`: estado de tres fases de `PostgresIdempotencyStore`. */
export const IdempotencyKeysMigration: SqlMigration = {
  name: 'PlatformIdempotencyKeys1794600000003',
  up: claimTableSql('idempotency_keys'),
  down: ['DROP TABLE IF EXISTS idempotency_keys'],
};

/**
 * `processed_messages`: idempotencia de consumidores (`PostgresProcessedMessageStore`).
 * Mismo esquema que `idempotency_keys`; la llave es `(consumidor, id del mensaje)`.
 * Va en cada shard para completar el mensaje en la misma transacción que los
 * efectos del handler.
 */
export const ProcessedMessagesMigration: SqlMigration = {
  name: 'PlatformProcessedMessages1794600000004',
  up: claimTableSql('processed_messages'),
  down: ['DROP TABLE IF EXISTS processed_messages'],
};

/**
 * `outbox`: mensajes por publicar (`PostgresOutboxStore`), escritos en la
 * transacción del cambio de negocio. `seq` desempata el orden de `created_at`
 * dentro de un grupo. Los índices parciales cubren solo las filas abiertas,
 * que son pocas: uno para recorrerlas en orden, otro para encontrar las
 * vencidas cuando hay muchas programadas para después (un destino caído) y
 * otro para buscar los anteriores abiertos de un grupo.
 */
export const OutboxMigration: SqlMigration = {
  name: 'PlatformOutbox1794600000005',
  up: [
    `CREATE TABLE outbox (
  id text PRIMARY KEY,
  seq bigserial NOT NULL,
  envelope jsonb NOT NULL,
  status text NOT NULL CHECK (status IN (${OUTBOX_STATUSES_SQL})),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  group_id text,
  delay_ms integer,
  last_error text,
  lease_owner text,
  lease_token text,
  lease_expires_at timestamptz
)`,
    `CREATE INDEX outbox_open_idx ON outbox (created_at, seq) WHERE status IN (${OPEN_OUTBOX_STATUSES_SQL})`,
    `CREATE INDEX outbox_due_idx ON outbox (next_attempt_at) WHERE status IN (${OPEN_OUTBOX_STATUSES_SQL})`,
    `CREATE INDEX outbox_group_idx ON outbox (group_id, created_at, seq) WHERE status IN (${OPEN_OUTBOX_STATUSES_SQL}) AND group_id IS NOT NULL`,
    `CREATE INDEX outbox_retention_idx ON outbox (status, updated_at) WHERE status IN (${CLOSED_OUTBOX_STATUSES_SQL})`,
  ],
  down: ['DROP TABLE IF EXISTS outbox'],
};

/** Tablas de idempotencia de operaciones internas. */
export const idempotencyMigrations: readonly SqlMigration[] = [
  IdempotencyKeysMigration,
];

/** Tablas de mensajería: mensajes procesados y outbox. */
export const messagingMigrations: readonly SqlMigration[] = [
  ProcessedMessagesMigration,
  OutboxMigration,
];

/**
 * Todas las migraciones de la plataforma para cada shard, en orden: funciones
 * y auditoría de `@platform/persistence`, idempotencia y mensajería. Un
 * servicio agrega las suyas después.
 */
export const shardMigrations: readonly SqlMigration[] = [
  ...persistenceMigrations,
  ...idempotencyMigrations,
  ...messagingMigrations,
];
