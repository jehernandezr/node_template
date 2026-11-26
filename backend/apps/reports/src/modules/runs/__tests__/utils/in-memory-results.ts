import type { ReportResult } from '@contracts/reports';
import { ReportResultStore } from '../../domain/report-result-store.js';

/** Report results kept in memory. */
export class InMemoryResults extends ReportResultStore {
  readonly saved = new Map<string, ReportResult>();

  override async save(runId: string, result: ReportResult): Promise<void> {
    this.saved.set(runId, result);
  }

  override async load(runId: string): Promise<ReportResult | undefined> {
    return this.saved.get(runId);
  }

  override async discard(runId: string): Promise<void> {
    this.saved.delete(runId);
  }
}
