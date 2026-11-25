import type { ReportRunStatus, ReportType } from '@contracts/reports';
import type { ReportRun } from './report-run.js';

/** A page of runs, from newest to oldest. */
export interface ReportRunPageRequest {
  readonly type?: ReportType;
  readonly status?: ReportRunStatus;
  readonly afterId?: string;
  readonly limit: number;
}

/** Report runs of the tenant of the open `ShardScope`. */
export abstract class ReportRunRepository {
  abstract insert(run: ReportRun): Promise<void>;
  abstract find(runId: string): Promise<ReportRun | undefined>;
  /**
   * Saves the changes and returns the run with its new version.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(run: ReportRun): Promise<ReportRun>;
  abstract page(request: ReportRunPageRequest): Promise<readonly ReportRun[]>;
}
