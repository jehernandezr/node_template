import { Injectable } from '@nestjs/common';
import {
  ReportColumnKind,
  ReportType,
  type ReportParams,
  type ReportRow,
} from '@contracts/reports';
import { TaskStatus } from '@contracts/tasks';
import { ProjectionsFacade } from '../../../projections/index.js';
import { ReportDefinition } from '../report-definition.js';

/** The tasks created in the range that are still current, by status. Statuses with no tasks count zero. */
@Injectable()
export class TasksByStatusReport extends ReportDefinition {
  readonly type = ReportType.TasksByStatus;
  readonly columns = [
    { key: 'status', header: 'Estado', kind: ReportColumnKind.Text },
    { key: 'tasks', header: 'Tareas', kind: ReportColumnKind.Integer },
  ];

  constructor(private readonly projections: ProjectionsFacade) {
    super();
  }

  async rows(tenantId: string, params: ReportParams): Promise<ReportRow[]> {
    const counts = await this.projections.taskStatusCounts(tenantId, params);
    return Object.values(TaskStatus).map((status) => ({
      cells: [
        status,
        String(counts.find((count) => count.status === status)?.count ?? 0),
      ],
    }));
  }
}
