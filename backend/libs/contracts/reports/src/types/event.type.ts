import type { UserRef } from '@contracts/platform';
import type { ReportRunStatus, ReportType } from '../enums/reports.enum.js';

/** A report run finished (ready or failed). */
export interface RunCompletedPayload {
  tenantId: string;
  runId: string;
  type: ReportType;
  status: ReportRunStatus;
  requestedBy: UserRef;
  completedAt: string;
}

/** Command that resumes a run in a worker. */
export interface ExecuteRunPayload {
  tenantId: string;
  runId: string;
}
