import { Injectable } from '@nestjs/common';
import {
  ReportColumnKind,
  ReportType,
  type ReportParams,
  type ReportRow,
} from '@contracts/reports';
import { ProjectionsFacade } from '../../../projections/index.js';
import { ReportDefinition } from '../report-definition.js';

/** Notifications per period and type, counted for each channel they went out through. */
@Injectable()
export class NotificationsDeliveryReport extends ReportDefinition {
  readonly type = ReportType.NotificationsDelivery;
  readonly columns = [
    { key: 'period', header: 'Periodo', kind: ReportColumnKind.Date },
    { key: 'type', header: 'Tipo', kind: ReportColumnKind.Text },
    { key: 'in_app', header: 'En la app', kind: ReportColumnKind.Integer },
    { key: 'push', header: 'Push', kind: ReportColumnKind.Integer },
    { key: 'email', header: 'Correo', kind: ReportColumnKind.Integer },
  ];

  constructor(private readonly projections: ProjectionsFacade) {
    super();
  }

  override async rows(
    tenantId: string,
    params: ReportParams,
  ): Promise<ReportRow[]> {
    const points = await this.projections.deliverySummary(tenantId, params);
    return points.map((point) => ({
      cells: [
        point.period,
        point.type,
        String(point.inApp),
        String(point.push),
        String(point.email),
      ],
    }));
  }
}
