import type {
  ReportResult,
  ReportRunDetail,
  ReportRunSummary,
} from '@contracts/reports';
import type { ReportRunState } from '../domain/report-run.js';

/** The run as the contract publishes it. Pure utility. */
export class RunViews {
  static summary(state: ReportRunState): ReportRunSummary {
    return {
      id: state.id,
      type: state.type,
      status: state.status,
      format: state.format,
      params: state.params,
      requestedBy: state.requestedBy,
      createdAt: state.createdAt.toISOString(),
      completedAt: state.completedAt?.toISOString() ?? null,
      expiresAt: state.expiresAt?.toISOString() ?? null,
    };
  }

  static detail(
    state: ReportRunState,
    result: ReportResult | undefined,
  ): ReportRunDetail {
    return { ...RunViews.summary(state), result: result ?? null };
  }
}
