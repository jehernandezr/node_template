import type { ReportResult } from '@contracts/reports';

/** Where the result of each run of the tenant of the open `ShardScope` lives, until it expires. */
export abstract class ReportResultStore {
  /**
   * Stores the result of a run.
   * @param runId Run that produced it.
   * @param result Rows of the report.
   */
  abstract save(runId: string, result: ReportResult): Promise<void>;
  /**
   * The stored result, or `undefined` if there is none or it was already deleted.
   * @param runId Run to read.
   * @returns The result, or `undefined`.
   */
  abstract load(runId: string): Promise<ReportResult | undefined>;
  /**
   * Deletes the result of a run; nothing happens when it is gone.
   * @param runId Run whose result is deleted.
   */
  abstract discard(runId: string): Promise<void>;
}
