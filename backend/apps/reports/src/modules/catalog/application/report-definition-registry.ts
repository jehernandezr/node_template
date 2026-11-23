import type { ReportType } from '@contracts/reports';
import type { ReportDefinition } from './report-definition.js';

/** Los tipos de reporte que ofrece el servicio. */
export abstract class ReportDefinitionRegistry {
  /** @throws ReportsError `REPORTS.TYPE.UNKNOWN` si el tipo no tiene definición. */
  abstract get(type: ReportType): ReportDefinition;
  abstract all(): readonly ReportDefinition[];
}
