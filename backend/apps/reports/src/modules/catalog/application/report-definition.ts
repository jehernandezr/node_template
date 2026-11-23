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
 * Un tipo de reporte: sus columnas y cómo calcula sus filas. Solo lee las proyecciones del propio shard del
 * tenant, nunca otro servicio ni otra base.
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
