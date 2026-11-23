import type { ReportGranularity } from '@contracts/reports';

/** Rango de fechas de calendario de un reporte, con ambos extremos incluidos. */
export interface ReportRange {
  readonly from: string;
  readonly to: string;
}

/** Un rango partido en periodos de la granularidad pedida. */
export interface BucketedRange extends ReportRange {
  readonly granularity: ReportGranularity;
}
