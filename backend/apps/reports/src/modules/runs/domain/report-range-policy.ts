import {
  ReportsErrorCode,
  ReportsLimits,
  type ReportParams,
} from '@contracts/reports';
import { ReportsError } from '../../../shared/errors/reports.error.js';

/** A report's range goes forward and does not exceed `ReportsLimits.maxRangeDays`. Pure utility. */
export class ReportRangePolicy {
  private static readonly DAY_MS = 86_400_000;

  /**
   * Checks that the range is ordered and not longer than allowed.
   * @param params Report parameters.
   * @throws ReportsError `REPORTS.PARAMS.INVALID_RANGE`.
   */
  static assertValid(params: ReportParams): void {
    const days =
      (Date.parse(`${params.to}T00:00:00.000Z`) -
        Date.parse(`${params.from}T00:00:00.000Z`)) /
        ReportRangePolicy.DAY_MS +
      1;
    if (days < 1 || days > ReportsLimits.maxRangeDays) {
      throw new ReportsError(ReportsErrorCode.ParamsInvalidRange, {
        from: params.from,
        to: params.to,
        maxDays: ReportsLimits.maxRangeDays,
      });
    }
  }
}
