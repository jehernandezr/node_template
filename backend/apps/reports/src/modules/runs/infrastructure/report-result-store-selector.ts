import { ReportResultStoreKind } from '../../../shared/enums/report-result-store-kind.enum.js';
import type { ReportResultStore } from '../domain/report-result-store.js';

/** Picks the `ReportResultStore` that `REPORTS_RESULT_STORE` asks for among the stores the module built. */
export class ReportResultStoreSelector {
  constructor(private readonly row: ReportResultStore) {}

  /** The store of the configured kind. */
  select(kind: ReportResultStoreKind): ReportResultStore {
    switch (kind) {
      case ReportResultStoreKind.Row:
        return this.row;
    }
  }
}
