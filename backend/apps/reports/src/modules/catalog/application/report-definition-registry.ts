import type { ReportType } from '@contracts/reports';
import type { ReportDefinition } from './report-definition.js';

/** The report types the service offers. */
export abstract class ReportDefinitionRegistry {
  /** @throws ReportsError `REPORTS.TYPE.UNKNOWN` if the type has no definition. */
  abstract get(type: ReportType): ReportDefinition;
  abstract all(): readonly ReportDefinition[];
}
