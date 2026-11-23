import { Injectable } from '@nestjs/common';
import {
  ReportColumnKind,
  ReportType,
  type ReportParams,
  type ReportRow,
} from '@contracts/reports';
import { ProjectionsFacade } from '../../../projections/index.js';
import { ReportDefinition } from '../report-definition.js';

/** Tareas creadas y terminadas por periodo. */
@Injectable()
export class TasksActivityReport extends ReportDefinition {
  readonly type = ReportType.TasksActivity;
  readonly columns = [
    { key: 'period', header: 'Periodo', kind: ReportColumnKind.Date },
    { key: 'created', header: 'Creadas', kind: ReportColumnKind.Integer },
    { key: 'completed', header: 'Terminadas', kind: ReportColumnKind.Integer },
  ];

  constructor(private readonly projections: ProjectionsFacade) {
    super();
  }

  async rows(tenantId: string, params: ReportParams): Promise<ReportRow[]> {
    const points = await this.projections.taskActivity(tenantId, params);
    return points.map((point) => ({
      cells: [point.period, String(point.created), String(point.completed)],
    }));
  }
}
