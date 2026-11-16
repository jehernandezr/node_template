import type { UserRef } from '@contracts/platform';
import type { ReportRunStatus, ReportType } from '../enums/reports.enum.js';

/** Terminó una ejecución de reporte (lista o fallida). */
export interface RunCompletedPayload {
  tenantId: string;
  runId: string;
  type: ReportType;
  status: ReportRunStatus;
  requestedBy: UserRef;
  completedAt: string;
}

/** Comando que retoma una ejecución en un worker. */
export interface ExecuteRunPayload {
  tenantId: string;
  runId: string;
}
