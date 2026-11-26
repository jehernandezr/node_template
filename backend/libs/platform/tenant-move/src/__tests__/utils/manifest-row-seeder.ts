import {
  UuidV7IdGenerator,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import type { DataSource, QueryRunner } from 'typeorm';

/** What the seeder queries through: a pool, or a connection inside the caller's transaction. */
type Queryable = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../../transfer/batch/sql-identifier.js';

interface ColumnInfo {
  readonly name: string;
  readonly dataType: string;
  readonly udtName: string;
  readonly generated: boolean;
  readonly maxLength: number | null;
}

/** What a fixed column receives to compute its value. */
export interface SeedRow {
  readonly tenantId: string;
  /** Row number within the table for this tenant, from 0. */
  readonly index: number;
  /** The value another column of the row seeded in an earlier table already has. */
  readonly valueOf: (table: string, column: string) => unknown;
}

/** Fixed values per table and column, for columns whose format cannot be inferred from the schema. */
export type FixedColumns = Readonly<
  Record<string, Readonly<Record<string, (row: SeedRow) => unknown>>>
>;

/**
 * Seeds a tenant's rows in each table of a manifest, reading the schema left by the real migrations:
 * puts the tenant in its column, links each child to its parent and each foreign key to the seeded row it
 * points to, takes the first value of a column's CHECK constraints and of enums, and fills the rest by type.
 */
export class ManifestRowSeeder {
  private readonly ids = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );
  private sequence = 0;

  constructor(
    private readonly manifest: TenantMoveManifest,
    private readonly fixed: FixedColumns = {},
  ) {}

  /** Seeds `rowsPerTable` tenant rows in each table, in manifest order. */
  async seed(
    dataSource: Queryable,
    tenantId: string,
    rowsPerTable: number,
  ): Promise<void> {
    const seeded = new Map<string, Record<string, unknown>[]>();
    for (const entry of this.manifest.tables()) {
      const columns = await this.columns(dataSource, entry.table);
      const references = await this.references(dataSource, entry.table);
      const choices = await this.choices(dataSource, entry.table, columns);
      const rows: Record<string, unknown>[] = [];
      for (let index = 0; index < rowsPerTable; index++) {
        const valueOf = (table: string, column: string): unknown =>
          seeded.get(table)?.[index]?.[column];
        const row: Record<string, unknown> = {};
        for (const column of columns.filter((c) => !c.generated)) {
          row[column.name] = this.valueFor(column, choices.get(column.name));
        }
        for (const [column, target] of references) {
          const value = valueOf(target.table, target.column);
          if (value !== undefined) {
            row[column] = value;
          }
        }
        const selector = entry.selector;
        if (selector.kind === TenantMoveSelectorKind.TenantColumn) {
          row[selector.column] = tenantId;
        } else {
          row[selector.column] = valueOf(
            selector.parent,
            selector.parentColumn,
          );
        }
        for (const [column, compute] of Object.entries(
          this.fixed[entry.table] ?? {},
        )) {
          row[column] = compute({ tenantId, index, valueOf });
        }
        await this.insert(dataSource, entry.table, row);
        rows.push(row);
      }
      seeded.set(entry.table, rows);
    }
  }

  private async insert(
    dataSource: Queryable,
    table: string,
    row: Record<string, unknown>,
  ): Promise<void> {
    const name = SqlIdentifier.quoteTable(table);
    const list = Object.keys(row)
      .map((column) => SqlIdentifier.quote(column))
      .join(', ');
    await dataSource.query(
      `INSERT INTO ${name} (${list}) SELECT ${list} FROM json_populate_record(NULL::${name}, $1::json)`,
      [JSON.stringify(row)],
    );
  }

  /** `[table, schema]` of a manifest name; without a schema, the session one. */
  private static nameOf(table: string): [string, string | null] {
    const [first, second] = table.split('.');
    return second === undefined ? [table, null] : [second, first ?? null];
  }

  private valueFor(column: ColumnInfo, choice: string | undefined): unknown {
    this.sequence += 1;
    const n = this.sequence;
    if (choice !== undefined) {
      return choice;
    }
    switch (column.udtName) {
      case 'uuid':
        return this.ids.next().toString();
      case 'int2':
      case 'int4':
      case 'int8':
        return n % 100;
      case 'numeric':
      case 'float4':
      case 'float8':
        return `${n % 100}.25`;
      case 'bool':
        return n % 2 === 0;
      case 'timestamptz':
      case 'timestamp':
        return new Date(Date.UTC(2026, 10, 1, 0, 0, n % 60)).toISOString();
      case 'date':
        return '2026-11-01';
      case 'json':
      case 'jsonb':
        return { seeded: n };
      case 'bytea':
        return `\\x${n.toString(16).padStart(4, '0')}`;
      case 'inet':
        return '10.0.0.1';
      case 'interval':
        return '1 hour';
      case 'text':
      case 'varchar':
      case 'bpchar':
      case 'citext':
        return `${column.name}-${n}`.slice(0, column.maxLength ?? undefined);
      default:
        if (column.dataType === 'ARRAY') {
          return [];
        }
        return null;
    }
  }

  private async columns(
    dataSource: Queryable,
    table: string,
  ): Promise<ColumnInfo[]> {
    const rows: {
      name: string;
      data_type: string;
      udt_name: string;
      is_generated: string;
      is_identity: string;
      max_length: number | null;
    }[] = await dataSource.query(
      `SELECT column_name AS name, data_type, udt_name, is_generated, is_identity,
              character_maximum_length AS max_length
         FROM information_schema.columns
        WHERE table_schema = coalesce($2::text, current_schema()) AND table_name = $1
        ORDER BY ordinal_position`,
      ManifestRowSeeder.nameOf(table),
    );
    return rows.map((row) => ({
      name: row.name,
      dataType: row.data_type,
      udtName: row.udt_name,
      generated: row.is_generated === 'ALWAYS' || row.is_identity === 'YES',
      maxLength: row.max_length,
    }));
  }

  /** Foreign keys of the table: each column with the table and column it points to. */
  private async references(
    dataSource: Queryable,
    table: string,
  ): Promise<Map<string, { table: string; column: string }>> {
    const rows: { name: string; ref_table: string; ref_column: string }[] =
      await dataSource.query(
        `SELECT a.attname AS name, rt.relname AS ref_table, ra.attname AS ref_column
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_class rt ON rt.oid = c.confrelid
           JOIN LATERAL unnest(c.conkey, c.confkey) AS k(col, ref) ON true
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.col
           JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = k.ref
          WHERE c.contype = 'f' AND t.relname = $1
            AND t.relnamespace = coalesce($2::text, current_schema())::regnamespace`,
        ManifestRowSeeder.nameOf(table),
      );
    return new Map(
      rows.map((row) => [
        row.name,
        { table: row.ref_table, column: row.ref_column },
      ]),
    );
  }

  /** A valid value for the columns of a single-column CHECK with literals, and for enum columns. */
  private async choices(
    dataSource: Queryable,
    table: string,
    columns: readonly ColumnInfo[],
  ): Promise<Map<string, string>> {
    const checks: { name: string; definition: string }[] =
      await dataSource.query(
        `SELECT a.attname AS name, pg_get_constraintdef(c.oid) AS definition
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
          WHERE c.contype = 'c' AND array_length(c.conkey, 1) = 1
            AND t.relname = $1 AND t.relnamespace = coalesce($2::text, current_schema())::regnamespace`,
        ManifestRowSeeder.nameOf(table),
      );
    const choices = new Map<string, string>();
    for (const check of checks) {
      const literal = /'((?:[^']|'')*)'/.exec(check.definition)?.[1];
      if (literal !== undefined) {
        choices.set(check.name, literal.replace(/''/g, "'"));
      }
    }
    for (const column of columns.filter((c) => c.dataType === 'USER-DEFINED')) {
      const labels: { label: string }[] = await dataSource.query(
        `SELECT e.enumlabel AS label FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
          WHERE ty.typname = $1 ORDER BY e.enumsortorder LIMIT 1`,
        [column.udtName],
      );
      const [first] = labels;
      if (first !== undefined) {
        choices.set(column.name, first.label);
      }
    }
    return choices;
  }
}
