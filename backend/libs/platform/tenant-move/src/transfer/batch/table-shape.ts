/** What the copy needs to know about a table, read from the PostgreSQL catalog. */
export interface TableShape {
  readonly table: string;
  /** Columns that are written; generated ones are not. */
  readonly columns: readonly string[];
  /** Columns of the primary key, in order. */
  readonly keyColumns: readonly string[];
  /** SQL type of each key column, to compare the cursor. */
  readonly keyTypes: readonly string[];
  /** Whether it has `updated_at`, the marker for delta rounds. */
  readonly hasUpdatedAt: boolean;
}
