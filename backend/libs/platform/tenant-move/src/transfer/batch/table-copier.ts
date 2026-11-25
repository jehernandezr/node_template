import type { QueryRunner } from 'typeorm';
import { KeyComparison } from './key-comparison.enum.js';
import type { KeyRange } from './key-range.js';
import type { RowPage } from './row-page.js';
import { SortDirection } from './sort-direction.enum.js';
import { SqlIdentifier } from './sql-identifier.js';
import type { TableChecksum } from './table-checksum.js';
import type { TableShape } from './table-shape.js';
import type { TenantRowFilter } from './tenant-row-filter.js';

interface PageRow {
  readonly row: string;
  readonly updated_at?: string;
  readonly [key: `k${number}`]: string;
}

/**
 * The statements of a table copy. It reads rows as JSON text, without passing them through JavaScript numbers,
 * and writes with `json_populate_recordset`, so each type returns to its exact value. Everything filters by the tenant in `$1`.
 */
export class TableCopier {
  private static readonly ALIAS = 't';

  constructor(
    private readonly shape: TableShape,
    private readonly filter: TenantRowFilter,
  ) {}

  /** Whether the table has `updated_at` for the delta rounds. */
  tracksUpdates(): boolean {
    return this.shape.hasUpdatedAt;
  }

  /** Key of the tenant's last row, or `undefined` if it has none. */
  async lastKey(
    runner: QueryRunner,
    tenantId: string,
  ): Promise<readonly string[] | undefined> {
    const rows: PageRow[] = await runner.query(
      `SELECT ${this.keySelect()} FROM ${this.from()} WHERE ${this.where()} ORDER BY ${this.keyOrder(SortDirection.Descending)} LIMIT 1`,
      [tenantId],
    );
    const [row] = rows;
    return row === undefined ? undefined : this.keyOf(row);
  }

  /** Latest `updated_at` of the tenant rows, as text. */
  async latestUpdate(
    runner: QueryRunner,
    tenantId: string,
  ): Promise<string | undefined> {
    const rows: { latest: string | null }[] = await runner.query(
      `SELECT max(t."updated_at")::text AS latest FROM ${this.from()} WHERE ${this.where()}`,
      [tenantId],
    );
    return rows[0]?.latest ?? undefined;
  }

  /** Tenant rows with a key greater than `after` and up to `upTo`, in key order. */
  async readAfterKey(
    runner: QueryRunner,
    tenantId: string,
    after: readonly string[] | undefined,
    limit: number,
    upTo?: readonly string[],
  ): Promise<RowPage | undefined> {
    const params: unknown[] = [tenantId];
    const cursor = this.range({ after, upTo }, params);
    params.push(limit);
    const rows: PageRow[] = await runner.query(
      `SELECT row_to_json(t)::text AS row, ${this.keySelect()} FROM ${this.from()} ` +
        `WHERE ${this.where()}${cursor} ORDER BY ${this.keyOrder(SortDirection.Ascending)} LIMIT $${params.length}`,
      params,
    );
    return this.page(rows);
  }

  /** Key of the tenant row that is `position` rows after `after`, or `undefined` if there are not that many. */
  async keyAt(
    runner: QueryRunner,
    tenantId: string,
    after: readonly string[] | undefined,
    position: number,
  ): Promise<readonly string[] | undefined> {
    const params: unknown[] = [tenantId];
    const cursor = this.range({ after }, params);
    params.push(position - 1);
    const rows: PageRow[] = await runner.query(
      `SELECT ${this.keySelect()} FROM ${this.from()} WHERE ${this.where()}${cursor} ` +
        `ORDER BY ${this.keyOrder(SortDirection.Ascending)} OFFSET $${params.length} LIMIT 1`,
      params,
    );
    const [row] = rows;
    return row === undefined ? undefined : this.keyOf(row);
  }

  /** Tenant rows changed between `since` and `until`, in `updated_at` and key order, after the cursor. */
  async readChangedSince(
    runner: QueryRunner,
    tenantId: string,
    window: { readonly since: string; readonly until: string },
    after: RowPage | undefined,
    limit: number,
  ): Promise<RowPage | undefined> {
    const params: unknown[] = [tenantId, window.since, window.until];
    let cursor = '';
    if (after?.lastUpdatedAt !== undefined) {
      params.push(after.lastUpdatedAt);
      const updatedAt = `$${params.length}::timestamptz`;
      cursor =
        ` AND (t."updated_at" > ${updatedAt} OR (t."updated_at" = ${updatedAt} AND ` +
        `${this.keyCompare(after.lastKey, KeyComparison.After, params)}))`;
    }
    params.push(limit);
    const rows: PageRow[] = await runner.query(
      `SELECT row_to_json(t)::text AS row, t."updated_at"::text AS updated_at, ${this.keySelect()} ` +
        `FROM ${this.from()} WHERE ${this.where()} AND t."updated_at" BETWEEN $2::timestamptz AND $3::timestamptz${cursor} ` +
        `ORDER BY t."updated_at", ${this.keyOrder(SortDirection.Ascending)} LIMIT $${params.length}`,
      params,
    );
    return this.page(rows);
  }

  /**
   * Writes the rows to the target: inserts the new ones and updates only those that changed.
   * @returns how many rows it inserted or changed.
   */
  async upsert(runner: QueryRunner, rows: readonly string[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const columns = this.shape.columns.map((c) => SqlIdentifier.quote(c));
    const list = columns.join(', ');
    const keys = this.shape.keyColumns.map((c) => SqlIdentifier.quote(c));
    const updatable = this.shape.columns
      .filter((c) => !this.shape.keyColumns.includes(c))
      .map((c) => SqlIdentifier.quote(c));
    const onConflict =
      updatable.length === 0
        ? 'DO NOTHING'
        : `DO UPDATE SET ${updatable.map((c) => `${c} = EXCLUDED.${c}`).join(', ')} ` +
          `WHERE (${updatable.map((c) => `t.${c}`).join(', ')}) IS DISTINCT FROM ` +
          `(${updatable.map((c) => `EXCLUDED.${c}`).join(', ')})`;
    const written: unknown[] = await runner.query(
      `INSERT INTO ${this.table()} AS t (${list}) ` +
        `SELECT ${list} FROM json_populate_recordset(NULL::${this.table()}, $1::json) ` +
        `ON CONFLICT (${keys.join(', ')}) ${onConflict} RETURNING 1`,
      [`[${rows.join(',')}]`],
    );
    return written.length;
  }

  /** Keys of the tenant rows in the range, as row text, to look them up on the other side. */
  async keysIn(
    runner: QueryRunner,
    tenantId: string,
    range: KeyRange,
    limit: number,
  ): Promise<
    | { readonly ids: readonly string[]; readonly lastKey: readonly string[] }
    | undefined
  > {
    const params: unknown[] = [tenantId];
    const cursor = this.range(range, params);
    params.push(limit);
    const rows: (PageRow & { id: string })[] = await runner.query(
      `SELECT ${this.rowKey()} AS id, ${this.keySelect()} FROM ${this.from()} ` +
        `WHERE ${this.where()}${cursor} ORDER BY ${this.keyOrder(SortDirection.Ascending)} LIMIT $${params.length}`,
      params,
    );
    const last = rows.at(-1);
    return last === undefined
      ? undefined
      : { ids: rows.map((row) => row.id), lastKey: this.keyOf(last) };
  }

  /** Of the given keys, those that exist for the tenant. */
  async existing(
    runner: QueryRunner,
    tenantId: string,
    ids: readonly string[],
  ): Promise<ReadonlySet<string>> {
    const rows: { id: string }[] = await runner.query(
      `SELECT ${this.rowKey()} AS id FROM ${this.from()} WHERE ${this.where()} AND ${this.rowKey()} = ANY($2::text[])`,
      [tenantId, [...ids]],
    );
    return new Set(rows.map((row) => row.id));
  }

  /** Deletes the tenant rows with those keys. */
  async deleteKeys(
    runner: QueryRunner,
    tenantId: string,
    ids: readonly string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await runner.query(
      `DELETE FROM ${this.from()} WHERE ${this.where()} AND ${this.rowKey()} = ANY($2::text[])`,
      [tenantId, [...ids]],
    );
  }

  /** Deletes up to `limit` tenant rows. Returns how many it deleted. */
  async deleteBatch(
    runner: QueryRunner,
    tenantId: string,
    limit: number,
  ): Promise<number> {
    const result = await runner.query(
      `DELETE FROM ${this.table()} WHERE ctid IN (SELECT t.ctid FROM ${this.from()} WHERE ${this.where()} LIMIT $2)`,
      [tenantId, limit],
      true,
    );
    return result.affected ?? 0;
  }

  /**
   * Count and checksum of the tenant rows, of the whole table or of a key range. The sum is
   * computed over the columns in name order, not over the whole row: the physical column order can
   * differ between source and target if a migration added them in a different order.
   */
  async checksum(
    runner: QueryRunner,
    tenantId: string,
    range: KeyRange = {},
  ): Promise<TableChecksum> {
    const params: unknown[] = [tenantId];
    const cursor = this.range(range, params);
    const rows: { rows: string; checksum: string }[] = await runner.query(
      `SELECT count(*)::text AS rows, md5(coalesce(string_agg(md5(${this.projection()}::text), '' ORDER BY ${this.keyOrder(SortDirection.Ascending)}), '')) AS checksum ` +
        `FROM ${this.from()} WHERE ${this.where()}${cursor}`,
      params,
    );
    const [row] = rows;
    return { rows: Number(row?.rows ?? 0), checksum: row?.checksum ?? '' };
  }

  /** Sets `column` to `value` in the tenant rows that have a different value. */
  async assign(
    runner: QueryRunner,
    tenantId: string,
    column: string,
    value: string,
  ): Promise<void> {
    const target = `${TableCopier.ALIAS}.${SqlIdentifier.quote(column)}`;
    await runner.query(
      `UPDATE ${this.from()} SET ${SqlIdentifier.quote(column)} = $2 WHERE ${this.where()} AND ${target} IS DISTINCT FROM $2`,
      [tenantId, value],
    );
  }

  private page(rows: readonly PageRow[]): RowPage | undefined {
    const last = rows.at(-1);
    if (last === undefined) {
      return undefined;
    }
    return {
      rows: rows.map((row) => row.row),
      lastKey: this.keyOf(last),
      ...(last.updated_at !== undefined && { lastUpdatedAt: last.updated_at }),
    };
  }

  private keyOf(row: PageRow): readonly string[] {
    return this.shape.keyColumns.map((_, index) => row[`k${index}`]);
  }

  /** ` AND ...` conditions for the key range; appends the values to `params`. */
  private range(range: KeyRange, params: unknown[]): string {
    const lower =
      range.after === undefined
        ? ''
        : ` AND ${this.keyCompare(range.after, KeyComparison.After, params)}`;
    const upper =
      range.upTo === undefined
        ? ''
        : ` AND ${this.keyCompare(range.upTo, KeyComparison.UpTo, params)}`;
    return `${lower}${upper}`;
  }

  /** `(key) <op> (values)` with each value cast to its type; appends the values to `params`. */
  private keyCompare(
    key: readonly string[],
    operator: KeyComparison,
    params: unknown[],
  ): string {
    const values = key.map((value, index) => {
      params.push(value);
      return `$${params.length}::${this.shape.keyTypes[index]}`;
    });
    return `(${this.keyColumns().join(', ')}) ${operator} (${values.join(', ')})`;
  }

  /** `ROW(...)` with the columns written by the copy, in name order. */
  private projection(): string {
    const columns = [...this.shape.columns]
      .sort()
      .map((column) => `${TableCopier.ALIAS}.${SqlIdentifier.quote(column)}`);
    return `ROW(${columns.join(', ')})`;
  }

  private keySelect(): string {
    return this.keyColumns()
      .map((column, index) => `${column}::text AS k${index}`)
      .join(', ');
  }

  private keyOrder(direction: SortDirection): string {
    return this.keyColumns()
      .map((column) => `${column} ${direction}`)
      .join(', ');
  }

  private rowKey(): string {
    return `ROW(${this.keyColumns().join(', ')})::text`;
  }

  private keyColumns(): string[] {
    return this.shape.keyColumns.map(
      (column) => `${TableCopier.ALIAS}.${SqlIdentifier.quote(column)}`,
    );
  }

  private where(): string {
    return this.filter.where(this.shape.table, TableCopier.ALIAS);
  }

  private from(): string {
    return `${this.table()} ${TableCopier.ALIAS}`;
  }

  private table(): string {
    return SqlIdentifier.quoteTable(this.shape.table);
  }
}
