import type { ReportResult } from '@contracts/reports';

/** Where the result of each run of the tenant of the open `ShardScope` lives, until it expires. */
export abstract class ReportResultStore {
  abstract save(runId: string, result: ReportResult): Promise<void>;
  /** The stored result, or `undefined` if there is none or it was already deleted. */
  abstract load(runId: string): Promise<ReportResult | undefined>;
  abstract discard(runId: string): Promise<void>;
}
