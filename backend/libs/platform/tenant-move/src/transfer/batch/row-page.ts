/** A batch of rows read from the source: each row as JSON and the cursor to request the next one. */
export interface RowPage {
  readonly rows: readonly string[];
  /** Key values of the last row, as text. */
  readonly lastKey: readonly string[];
  /** `updated_at` of the last row, as text, in reads by change. */
  readonly lastUpdatedAt?: string;
}
