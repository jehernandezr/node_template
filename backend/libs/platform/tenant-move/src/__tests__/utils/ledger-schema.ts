/** Schema of the test tables, with per-tenant RLS like a service's tables. */
export class LedgerSchema {
  /** The write fence and the verification progress, which the platform migrations create in a service. */
  static readonly PLATFORM: readonly string[] = [
    'CREATE TABLE tenant_write_fences (tenant_id text PRIMARY KEY, move_id text NOT NULL, created_at timestamptz NOT NULL, switched_at timestamptz)',
    `CREATE TABLE tenant_move_checkpoints (
       move_id text NOT NULL, table_name text NOT NULL, reconciled_key jsonb, verified_rows integer, verified_checksum text,
       updated_at timestamptz NOT NULL, PRIMARY KEY (move_id, table_name))`,
  ];

  static readonly TABLES: readonly string[] = [
    `CREATE TABLE ledgers (
       id uuid PRIMARY KEY, tenant_id uuid NOT NULL, name text NOT NULL, total bigint NOT NULL,
       tags jsonb NOT NULL DEFAULT '[]', version integer NOT NULL DEFAULT 1,
       search tsvector GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED,
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE entries (
       id uuid PRIMARY KEY, ledger_id uuid NOT NULL, amount numeric(20, 4) NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE attempts (
       id uuid PRIMARY KEY, tenant_id uuid NOT NULL, outcome text NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now())`,
    'ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE ledgers FORCE ROW LEVEL SECURITY',
    `CREATE POLICY ledgers_tenant_isolation ON ledgers
       USING (tenant_id::text = nullif(current_setting('app.tenant_id', true), ''))
       WITH CHECK (tenant_id::text = nullif(current_setting('app.tenant_id', true), ''))`,
  ];

  static readonly STATEMENTS: readonly string[] = [
    ...LedgerSchema.TABLES,
    ...LedgerSchema.PLATFORM,
  ];
}
