import { Injectable } from '@nestjs/common';
import {
  ReportColumnKind,
  ReportType,
  type ReportParams,
  type ReportRow,
} from '@contracts/reports';
import { ProjectionsFacade } from '../../../projections/index.js';
import { ReportDefinition } from '../report-definition.js';

/** Invoices issued per period and currency, how many were paid or failed and the total issued in minor units. */
@Injectable()
export class InvoicesSummaryReport extends ReportDefinition {
  readonly type = ReportType.InvoicesSummary;
  readonly columns = [
    { key: 'period', header: 'Periodo', kind: ReportColumnKind.Date },
    { key: 'currency', header: 'Moneda', kind: ReportColumnKind.Text },
    { key: 'issued', header: 'Emitidas', kind: ReportColumnKind.Integer },
    { key: 'paid', header: 'Pagadas', kind: ReportColumnKind.Integer },
    { key: 'failed', header: 'Fallidas', kind: ReportColumnKind.Integer },
    {
      key: 'issued_minor',
      header: 'Total emitido',
      kind: ReportColumnKind.Integer,
    },
  ];

  constructor(private readonly projections: ProjectionsFacade) {
    super();
  }

  override async rows(
    tenantId: string,
    params: ReportParams,
  ): Promise<ReportRow[]> {
    const points = await this.projections.invoiceSummary(tenantId, params);
    return points.map((point) => ({
      cells: [
        point.period,
        point.currency,
        String(point.issued),
        String(point.paid),
        String(point.failed),
        String(point.issuedMinor),
      ],
    }));
  }
}
