import {
  ReportColumnKind,
  ReportType,
  ReportsErrorCode,
  type ReportColumn,
  type ReportRow,
} from '@contracts/reports';
import {
  ReportDefinition,
  ReportDefinitionRegistry,
} from '../../../catalog/index.js';
import { ReportsError } from '../../../../shared/errors/reports.error.js';

/** Report of tasks by status whose rows the test sets. */
export class FixedTasksReport extends ReportDefinition {
  override readonly type = ReportType.TasksByStatus;
  override readonly columns: readonly ReportColumn[] = [
    { key: 'status', header: 'Status', kind: ReportColumnKind.Text },
    { key: 'count', header: 'Count', kind: ReportColumnKind.Integer },
  ];
  rowsToReturn: ReportRow[] = [{ cells: ['done', '3'] }];

  override async rows(): Promise<ReportRow[]> {
    return this.rowsToReturn;
  }
}

/** Registry with only the tasks by status report. */
export class FixedDefinitions extends ReportDefinitionRegistry {
  readonly tasks = new FixedTasksReport();

  override get(type: ReportType): ReportDefinition {
    if (type !== this.tasks.type) {
      throw new ReportsError(ReportsErrorCode.TypeUnknown);
    }
    return this.tasks;
  }

  override all(): readonly ReportDefinition[] {
    return [this.tasks];
  }
}
