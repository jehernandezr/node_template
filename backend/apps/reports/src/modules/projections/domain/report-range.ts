import type { ReportGranularity } from '@contracts/reports';

/** Calendar date range of a report, with both ends included. */
export interface ReportRange {
  readonly from: string;
  readonly to: string;
}

/** A range split into periods of the requested granularity. */
export interface BucketedRange extends ReportRange {
  readonly granularity: ReportGranularity;
}
