import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportsErrorCode,
  ReportType,
} from '@contracts/reports';
import { ReportRun } from '../report-run.js';

const NOW = new Date('2026-11-20T10:00:00.000Z');
const DAY_MS = 86_400_000;

const queued = () =>
  ReportRun.request({
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
    type: ReportType.TasksByStatus,
    format: ReportFormat.Csv,
    params: {
      from: '2026-11-01',
      to: '2026-11-30',
      granularity: ReportGranularity.Day,
    },
    requestedBy: {
      userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
      homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
    },
    now: NOW,
  });

describe('ReportRun', () => {
  it('stays pending while queued or running', () => {
    const run = queued();
    const before = run.isPending();
    run.start();

    expect([before, run.isPending()]).toEqual([true, true]);
  });

  it('hands out its result until it expires', () => {
    const run = queued();
    run.complete(20, NOW, 30 * DAY_MS);

    expect(run.snapshot()).toMatchObject({
      status: ReportRunStatus.Ready,
      expiresAt: new Date(NOW.getTime() + 30 * DAY_MS),
    });
    expect(() =>
      run.assertReady(new Date(NOW.getTime() + DAY_MS)),
    ).not.toThrow();
    expect(() =>
      run.assertReady(new Date(NOW.getTime() + 30 * DAY_MS)),
    ).toThrow(expect.objectContaining({ code: ReportsErrorCode.RunExpired }));
  });

  it('has no result to hand out while queued or after failing', () => {
    const run = queued();
    const whileQueued = () => run.assertReady(NOW);
    run.fail(ReportsErrorCode.ResultTooLarge, NOW);

    expect(whileQueued).toThrow(
      expect.objectContaining({ code: ReportsErrorCode.RunNotReady }),
    );
    expect(run.isPending()).toBe(false);
    expect(() => run.assertReady(NOW)).toThrow(
      expect.objectContaining({ code: ReportsErrorCode.RunNotReady }),
    );
  });
});
