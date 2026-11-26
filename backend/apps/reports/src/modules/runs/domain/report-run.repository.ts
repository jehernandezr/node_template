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
  /**
   * Stores a new run.
   * @param run Run to store.
   */
  abstract insert(run: ReportRun): Promise<void>;
  /**
   * Reads a run of the tenant in scope.
   * @param runId Run to read.
   * @returns The run, or `undefined`.
   */
  abstract find(runId: string): Promise<ReportRun | undefined>;
  /**
   * Saves the changes and returns the run with its new version.
   * @param run Run read earlier and changed.
   * @returns The stored run.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(run: ReportRun): Promise<ReportRun>;
  /**
   * Reads a page of the tenant runs, newest first.
   * @param request Cursor and page size.
   * @returns The runs of the page.
   */
  abstract page(request: ReportRunPageRequest): Promise<readonly ReportRun[]>;
}
