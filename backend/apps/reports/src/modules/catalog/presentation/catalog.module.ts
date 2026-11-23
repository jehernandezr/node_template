import { Global, Module } from '@nestjs/common';
import { InvoicesSummaryReport } from '../application/definitions/invoices-summary.report.js';
import { NotificationsDeliveryReport } from '../application/definitions/notifications-delivery.report.js';
import { TasksActivityReport } from '../application/definitions/tasks-activity.report.js';
import { TasksByStatusReport } from '../application/definitions/tasks-by-status.report.js';
import { ReportCatalog } from '../application/report-catalog.js';
import { ReportDefinitionRegistry } from '../application/report-definition-registry.js';
import { CatalogController } from './catalog.controller.js';

/** Los tipos de reporte y su catálogo público. Global solo para el registro. */
@Global()
@Module({
  controllers: [CatalogController],
  providers: [
    TasksByStatusReport,
    TasksActivityReport,
    InvoicesSummaryReport,
    NotificationsDeliveryReport,
    { provide: ReportDefinitionRegistry, useClass: ReportCatalog },
  ],
  exports: [ReportDefinitionRegistry],
})
export class CatalogModule {}
