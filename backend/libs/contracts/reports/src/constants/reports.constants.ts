/** Límites de los campos de reports. Todo texto y toda lista del contrato se acotan con uno de estos valores. */
export const ReportsLimits = {
  /** Días que abarca como máximo el rango de un reporte. */
  maxRangeDays: 366,
  maxColumns: 20,
  maxRows: 10_000,
  columnKeyMaxLength: 64,
  columnHeaderMaxLength: 120,
  cellMaxLength: 1000,
  fileNameMaxLength: 200,
  contentTypeMaxLength: 100,
  /** Texto de una descarga: debe caber en `REPORTS_MAX_RESULT_BYTES`. */
  downloadContentMaxLength: 8_000_000,
  /** Tipos de reporte que puede listar el catálogo. */
  maxCatalogEntries: 20,
  /** Formatos que admite un mismo tipo de reporte. */
  maxFormats: 2,
  /** Granularidades que admite un mismo tipo de reporte. */
  maxGranularities: 3,
} as const;
