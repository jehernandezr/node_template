import type { SqlMigration } from './sql-migration.js';

/**
 * Funciones de la plataforma en cada shard:
 * - `platform_uuid_v7()`: UUIDv7 generado en la base, solo para filas que crea
 *   un trigger (auditoría). Todo lo demás usa el puerto `IdGenerator`.
 * - `platform_uuid_v7_lower_bound(ts)`: menor UUIDv7 de un instante, para los
 *   límites de las particiones por rango sobre `id`.
 * - `platform_ensure_partitions(tabla, intervalo, adelante)`: crea las
 *   particiones del intervalo actual y de los siguientes. Lo llama un job.
 * - `platform_detach_partitions_before(tabla, intervalo, corte)`: separa las
 *   particiones vencidas para archivarlas (retención).
 * - `platform_reject_mutation(nombre)`: trigger que deja una tabla solo para
 *   inserciones. El argumento nombra la tabla en el error (en una tabla
 *   particionada, `TG_TABLE_NAME` sería la partición).
 * - `platform_audit_row()`: trigger de auditoría (ver `auditTriggerSql`).
 */
export const PlatformFunctionsMigration: SqlMigration = {
  name: 'PlatformFunctions1794600000001',
  up: [
    `CREATE OR REPLACE FUNCTION platform_uuid_v7() RETURNS uuid
LANGUAGE sql VOLATILE AS $fn$
  SELECT encode(
    set_bit(set_bit(
      overlay(uuid_send(gen_random_uuid())
        PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
        FROM 1 FOR 6),
      52, 1), 53, 1),
    'hex')::uuid
$fn$`,
    `CREATE OR REPLACE FUNCTION platform_uuid_v7_lower_bound(ts timestamptz) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT (lpad(to_hex(floor(extract(epoch FROM ts) * 1000)::bigint), 12, '0') || '00000000000000000000')::uuid
$fn$`,
    `CREATE OR REPLACE FUNCTION platform_ensure_partitions(parent text, step text, ahead integer)
RETURNS integer LANGUAGE plpgsql AS $fn$
DECLARE
  created integer := 0;
  bucket timestamptz;
  child text;
BEGIN
  IF step NOT IN ('day', 'month') THEN
    RAISE EXCEPTION 'platform_ensure_partitions: step must be day or month';
  END IF;
  FOR i IN 0..ahead LOOP
    bucket := date_trunc(step, now()) + make_interval(
      months => CASE WHEN step = 'month' THEN i ELSE 0 END,
      days => CASE WHEN step = 'day' THEN i ELSE 0 END);
    child := parent || '_' || to_char(bucket, CASE WHEN step = 'month' THEN 'YYYYMM' ELSE 'YYYYMMDD' END);
    IF to_regclass(quote_ident(child)) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        child, parent,
        platform_uuid_v7_lower_bound(bucket),
        platform_uuid_v7_lower_bound(bucket + ('1 ' || step)::interval));
      created := created + 1;
    END IF;
  END LOOP;
  RETURN created;
END
$fn$`,
    `CREATE OR REPLACE FUNCTION platform_detach_partitions_before(parent text, step text, cutoff timestamptz)
RETURNS integer LANGUAGE plpgsql AS $fn$
DECLARE
  detached integer := 0;
  child record;
  bucket timestamptz;
BEGIN
  FOR child IN
    SELECT c.relname AS name
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = parent
      AND c.relname ~ ('^' || parent || '_[0-9]{6}([0-9]{2})?$')
  LOOP
    bucket := to_timestamp(substring(child.name FROM length(parent) + 2),
      CASE WHEN step = 'month' THEN 'YYYYMM' ELSE 'YYYYMMDD' END);
    IF bucket + ('1 ' || step)::interval <= cutoff THEN
      EXECUTE format('ALTER TABLE %I DETACH PARTITION %I', parent, child.name);
      detached := detached + 1;
    END IF;
  END LOOP;
  RETURN detached;
END
$fn$`,
    `CREATE OR REPLACE FUNCTION platform_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION '% is append only', COALESCE(TG_ARGV[0], TG_TABLE_NAME)
    USING ERRCODE = 'insufficient_privilege';
END
$fn$`,
    `CREATE OR REPLACE FUNCTION platform_audit_row() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  id_column text := TG_ARGV[0];
  excluded text[] := CASE WHEN TG_NARGS > 1 THEN TG_ARGV[1:TG_NARGS - 1] ELSE ARRAY[]::text[] END;
  old_row jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  new_row jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  row_id text := COALESCE(new_row ->> id_column, old_row ->> id_column);
  row_tenant text := COALESCE(new_row ->> 'tenant_id', old_row ->> 'tenant_id');
  changed_old jsonb;
  changed_new jsonb;
BEGIN
  old_row := old_row - excluded;
  new_row := new_row - excluded;
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
      INTO changed_old, changed_new
      FROM jsonb_each(new_row) AS n
      JOIN jsonb_each(old_row) AS o ON o.key = n.key
      WHERE n.value IS DISTINCT FROM o.value;
    IF changed_new IS NULL THEN
      RETURN NULL;
    END IF;
    old_row := changed_old;
    new_row := changed_new;
  END IF;
  INSERT INTO audit_log (
    id, table_name, row_id, operation, old_values, new_values,
    actor_id, actor_type, tenant_id, trace_id, occurred_at)
  VALUES (
    platform_uuid_v7(), TG_TABLE_NAME, row_id, TG_OP, old_row, new_row,
    NULLIF(current_setting('app.actor_id', true), ''),
    NULLIF(current_setting('app.actor_type', true), ''),
    COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), row_tenant),
    NULLIF(current_setting('app.trace_id', true), ''),
    now());
  RETURN NULL;
END
$fn$`,
  ],
  down: [
    'DROP FUNCTION IF EXISTS platform_audit_row()',
    'DROP FUNCTION IF EXISTS platform_reject_mutation()',
    'DROP FUNCTION IF EXISTS platform_detach_partitions_before(text, text, timestamptz)',
    'DROP FUNCTION IF EXISTS platform_ensure_partitions(text, text, integer)',
    'DROP FUNCTION IF EXISTS platform_uuid_v7_lower_bound(timestamptz)',
    'DROP FUNCTION IF EXISTS platform_uuid_v7()',
  ],
};

/**
 * `audit_log`: particionada por mes sobre `id` (UUIDv7), solo inserciones, con
 * una partición `DEFAULT` para que un mes sin partición nunca pierda registros.
 * La retención se aplica separando particiones, nunca con `DELETE`.
 */
export const AuditLogMigration: SqlMigration = {
  name: 'PlatformAuditLog1794600000002',
  up: [
    `CREATE TABLE audit_log (
  id uuid NOT NULL,
  table_name text NOT NULL,
  row_id text,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  actor_id text,
  actor_type text,
  tenant_id text,
  trace_id text,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (id)
) PARTITION BY RANGE (id)`,
    'CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT',
    'CREATE INDEX audit_log_row_idx ON audit_log (table_name, row_id, id)',
    'CREATE INDEX audit_log_tenant_idx ON audit_log (tenant_id, id)',
    `CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION platform_reject_mutation('audit_log')`,
    `SELECT platform_ensure_partitions('audit_log', 'month', 3)`,
  ],
  down: ['DROP TABLE IF EXISTS audit_log CASCADE'],
};

/**
 * `idempotency_keys`: estado de tres fases de `PostgresIdempotencyStore`.
 * Los instantes van en milisegundos epoch del `Clock` de la app, igual que el
 * adaptador en memoria, así las pruebas controlan el tiempo.
 */
export const IdempotencyKeysMigration: SqlMigration = {
  name: 'PlatformIdempotencyKeys1794600000003',
  up: [
    `CREATE TABLE idempotency_keys (
  key text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('in-progress', 'completed')),
  fingerprint text NOT NULL,
  claim_token text,
  lease_until bigint,
  attempt integer NOT NULL,
  result jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
)`,
    'CREATE INDEX idempotency_keys_updated_idx ON idempotency_keys (state, updated_at)',
  ],
  down: ['DROP TABLE IF EXISTS idempotency_keys'],
};

/**
 * `processed_messages`: idempotencia de consumidores (`PostgresProcessedMessageStore`
 * de `@platform/adapters-postgres`). Mismo esquema de tres fases que
 * `idempotency_keys`; la llave es `(consumidor, id del mensaje)`. Va en cada shard
 * para completar el mensaje en la misma transacción que los efectos del handler.
 */
export const ProcessedMessagesMigration: SqlMigration = {
  name: 'PlatformProcessedMessages1794600000004',
  up: [
    `CREATE TABLE processed_messages (
  key text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('in-progress', 'completed')),
  fingerprint text NOT NULL,
  claim_token text,
  lease_until bigint,
  attempt integer NOT NULL,
  result jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
)`,
    'CREATE INDEX processed_messages_updated_idx ON processed_messages (state, updated_at)',
  ],
  down: ['DROP TABLE IF EXISTS processed_messages'],
};

/**
 * `outbox`: mensajes por publicar (`PostgresOutboxStore` de `@platform/adapters-postgres`),
 * escritos en la transacción del cambio de negocio. Los estados son los de
 * `OutboxStatus` de `@platform/messaging`. `seq` desempata el orden de
 * `created_at` dentro de un grupo. Los instantes son `timestamptz` del `Clock` de la app.
 * Los índices parciales cubren solo las filas abiertas, que son pocas.
 */
export const OutboxMigration: SqlMigration = {
  name: 'PlatformOutbox1794600000005',
  up: [
    `CREATE TABLE outbox (
  id text PRIMARY KEY,
  seq bigserial NOT NULL,
  envelope jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'published', 'failed', 'dead')),
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
    `CREATE INDEX outbox_due_idx ON outbox (created_at, seq) WHERE status IN ('pending', 'failed')`,
    `CREATE INDEX outbox_group_idx ON outbox (group_id, created_at, seq) WHERE status IN ('pending', 'failed') AND group_id IS NOT NULL`,
    `CREATE INDEX outbox_retention_idx ON outbox (status, updated_at) WHERE status IN ('published', 'dead')`,
  ],
  down: ['DROP TABLE IF EXISTS outbox'],
};

/** Migraciones de la plataforma para cada shard, en orden. */
export const shardMigrations: readonly SqlMigration[] = [
  PlatformFunctionsMigration,
  AuditLogMigration,
  IdempotencyKeysMigration,
  ProcessedMessagesMigration,
  OutboxMigration,
];
