import type { QueryRunner } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';
import type { TableShape } from './table-shape.js';

interface ColumnRow {
  readonly name: string;
  readonly generated: boolean;
}

interface KeyRow {
  readonly name: string;
  readonly type: string;
}

/** Reads the columns and primary key of a shard table. */
export class TableShapeReader {
  private static readonly UPDATED_AT = 'updated_at';

  /**
   * Reads the columns, primary key and `updated_at` of a table.
   * @param runner Connection of the shard.
   * @param table Table to read.
   * @returns The table shape.
   * @throws TenantMoveError `InvalidManifest` if the table does not exist or has no primary key.
   */
  async read(runner: QueryRunner, table: string): Promise<TableShape> {
    const columns: ColumnRow[] = await runner.query(
      `SELECT a.attname AS name, a.attgenerated <> '' AS generated
         FROM pg_attribute a
        WHERE a.attrelid = to_regclass($1) AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum`,
      [table],
    );
    const keys: KeyRow[] = await runner.query(
      `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type
         FROM pg_index i
         JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, position) ON true
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE i.indrelid = to_regclass($1) AND i.indisprimary
        ORDER BY k.position`,
      [table],
    );
    if (columns.length === 0 || keys.length === 0) {
      throw new TenantMoveError(
        TenantMoveErrorCode.InvalidManifest,
        'The table does not exist or has no primary key',
        { table },
      );
    }
    return {
      table,
      columns: columns.filter((c) => !c.generated).map((c) => c.name),
      keyColumns: keys.map((k) => k.name),
      keyTypes: keys.map((k) => k.type),
      hasUpdatedAt: columns.some((c) => c.name === TableShapeReader.UPDATED_AT),
    };
  }
}
