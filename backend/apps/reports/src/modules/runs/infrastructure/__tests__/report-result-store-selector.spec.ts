import type { ReportResult } from '@contracts/reports';
import { ReportResultStoreKind } from '../../../../shared/enums/report-result-store-kind.enum.js';
import { ReportResultStore } from '../../domain/report-result-store.js';
import { ReportResultStoreSelector } from '../report-result-store-selector.js';

class MapResultStore extends ReportResultStore {
  private readonly results = new Map<string, ReportResult>();

  save(runId: string, result: ReportResult): Promise<void> {
    this.results.set(runId, result);
    return Promise.resolve();
  }

  load(runId: string): Promise<ReportResult | undefined> {
    return Promise.resolve(this.results.get(runId));
  }

  discard(runId: string): Promise<void> {
    this.results.delete(runId);
    return Promise.resolve();
  }
}

describe('ReportResultStoreSelector', () => {
  it('stores results in the run row when the kind is row', () => {
    const row = new MapResultStore();

    expect(
      new ReportResultStoreSelector(row).select(ReportResultStoreKind.Row),
    ).toBe(row);
  });
});
