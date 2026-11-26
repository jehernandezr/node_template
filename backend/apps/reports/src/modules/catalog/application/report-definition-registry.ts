import type { ReportType } from '@contracts/reports';
import type { ReportDefinition } from './report-definition.js';

/** The report types the service offers. */
export abstract class ReportDefinitionRegistry {
  /**
   * Reads the definition of a report type.
   * @param type Report type.
   * @returns Its definition.
   * @throws ReportsError `REPORTS.TYPE.UNKNOWN` if the type has no definition.
   */
  abstract get(type: ReportType): ReportDefinition;
  /**
   * Lists every registered definition.
   * @returns The definitions.
   */
  abstract all(): readonly ReportDefinition[];
}
