import { ReportGranularity, ReportsErrorCode } from '@contracts/reports';
import { ReportRangePolicy } from '../report-range-policy.js';

const params = (from: string, to: string) => ({
  from,
  to,
  granularity: ReportGranularity.Month,
});

describe('ReportRangePolicy', () => {
  it('accepts a range of one day up to a leap year', () => {
    expect(() =>
      ReportRangePolicy.assertValid(params('2026-11-20', '2026-11-20')),
    ).not.toThrow();
    expect(() =>
      ReportRangePolicy.assertValid(params('2028-01-01', '2028-12-31')),
    ).not.toThrow();
  });

  it.each([
    ['ends before it starts', params('2026-11-20', '2026-11-19')],
    ['is longer than the maximum', params('2026-01-01', '2027-01-02')],
  ])('rejects a range that %s', (_case, range) => {
    expect(() => ReportRangePolicy.assertValid(range)).toThrow(
      expect.objectContaining({ code: ReportsErrorCode.ParamsInvalidRange }),
    );
  });
});
