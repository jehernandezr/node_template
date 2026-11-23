import { Injectable } from '@nestjs/common';
import { ReportsErrorCode, type ReportType } from '@contracts/reports';
import { ReportsError } from '../../../shared/errors/reports.error.js';
import { InvoicesSummaryReport } from './definitions/invoices-summary.report.js';
import { NotificationsDeliveryReport } from './definitions/notifications-delivery.report.js';
import { TasksActivityReport } from './definitions/tasks-activity.report.js';
import { TasksByStatusReport } from './definitions/tasks-by-status.report.js';
import type { ReportDefinition } from './report-definition.js';
import { ReportDefinitionRegistry } from './report-definition-registry.js';

/** Los cuatro reportes de la plantilla. Un reporte nuevo es una clase más en este constructor. */
@Injectable()
export class ReportCatalog extends ReportDefinitionRegistry {
  private readonly definitions: readonly ReportDefinition[];

  constructor(
    byStatus: TasksByStatusReport,
    activity: TasksActivityReport,
    invoices: InvoicesSummaryReport,
    deliveries: NotificationsDeliveryReport,
  ) {
    super();
    this.definitions = [byStatus, activity, invoices, deliveries];
  }

  get(type: ReportType): ReportDefinition {
    const definition = this.definitions.find((d) => d.type === type);
    if (definition === undefined) {
      throw new ReportsError(ReportsErrorCode.TypeUnknown, { type });
    }
    return definition;
  }

  all(): readonly ReportDefinition[] {
    return this.definitions;
  }
}
