/** Field limits of reports. Every text and every list in the contract is bounded by one of these values. */
export const ReportsLimits = {
  /** Maximum number of days a report range spans. */
  maxRangeDays: 366,
  maxColumns: 20,
  maxRows: 10_000,
  columnKeyMaxLength: 64,
  columnHeaderMaxLength: 120,
  cellMaxLength: 1000,
  fileNameMaxLength: 200,
  contentTypeMaxLength: 100,
  /** Text of a download: must fit in `REPORTS_MAX_RESULT_BYTES`. */
  downloadContentMaxLength: 8_000_000,
  /** Report types the catalog can list. */
  maxCatalogEntries: 20,
  /** Formats a single report type supports. */
  maxFormats: 2,
  /** Granularities a single report type supports. */
  maxGranularities: 3,
} as const;
