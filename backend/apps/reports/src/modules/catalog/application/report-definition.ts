import {
  ReportFormat,
  ReportGranularity,
  type ReportCatalogEntry,
  type ReportColumn,
  type ReportParams,
  type ReportRow,
  type ReportType,
} from '@contracts/reports';

/**
 * A report type: its columns and how it computes its rows. It only reads the projections of the tenant's own
 * shard, never another service or another database.
 */
export abstract class ReportDefinition {
  abstract readonly type: ReportType;
  abstract readonly columns: readonly ReportColumn[];
  readonly formats: readonly ReportFormat[] = [
    ReportFormat.Json,
    ReportFormat.Csv,
  ];
  readonly granularities: readonly ReportGranularity[] =
    Object.values(ReportGranularity);

  abstract rows(tenantId: string, params: ReportParams): Promise<ReportRow[]>;

  entry(): ReportCatalogEntry {
    return {
      type: this.type,
      formats: [...this.formats],
      granularities: [...this.granularities],
    };
  }
}
