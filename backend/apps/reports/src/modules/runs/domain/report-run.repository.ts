import type { ReportRunStatus, ReportType } from '@contracts/reports';
import type { ReportRun } from './report-run.js';

/** Una página de ejecuciones, de la más nueva a la más vieja. */
export interface ReportRunPageRequest {
  readonly type?: ReportType;
  readonly status?: ReportRunStatus;
  readonly afterId?: string;
  readonly limit: number;
}

/** Ejecuciones de reporte del tenant del `ShardScope` abierto. */
export abstract class ReportRunRepository {
  abstract insert(run: ReportRun): Promise<void>;
  abstract find(runId: string): Promise<ReportRun | undefined>;
  /**
   * Guarda los cambios y devuelve la ejecución con su versión nueva.
   * @throws OptimisticLockError si otra escritura la cambió desde que se leyó.
   */
  abstract update(run: ReportRun): Promise<ReportRun>;
  abstract page(request: ReportRunPageRequest): Promise<readonly ReportRun[]>;
}
