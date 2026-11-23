import {
  ReportsErrorCode,
  ReportsLimits,
  type ReportParams,
} from '@contracts/reports';
import { ReportsError } from '../../../shared/errors/reports.error.js';

/** El rango de un reporte va hacia delante y no pasa de `ReportsLimits.maxRangeDays`. Utilidad pura. */
export class ReportRangePolicy {
  private static readonly DAY_MS = 86_400_000;

  /** @throws ReportsError `REPORTS.PARAMS.INVALID_RANGE`. */
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
