import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportsCommand,
  ReportsErrorCode,
  ReportType,
} from '@contracts/reports';
import { PlatformErrorCode } from '@contracts/platform';
import { RunsHarness } from '../../__tests__/utils/index.js';

const REQUEST = {
  type: ReportType.TasksByStatus,
  format: ReportFormat.Json,
  params: {
    from: '2026-11-01',
    to: '2026-11-15',
    granularity: ReportGranularity.Day,
  },
};

describe('CreateRun', () => {
  it('queues the run in the member tenant and sends the command that executes it', async () => {
    const harness = new RunsHarness();

    const { runId } = await harness.create().execute(harness.member, REQUEST);

    expect(harness.runs.stateOf(runId)).toMatchObject({
      status: ReportRunStatus.Queued,
      requestedBy: harness.member.ref,
    });
    expect(harness.bus.messages).toEqual([
      expect.objectContaining({
        type: ReportsCommand.ExecuteRun,
        tenantId: RunsHarness.TENANT,
        data: { tenantId: RunsHarness.TENANT, runId },
      }),
    ]);
  });

  it('refuses a CSV run when the plan does not include advanced reports, and queues nothing', async () => {
    const harness = new RunsHarness();
    harness.entitlements.advanced = false;

    await expect(
      harness
        .create()
        .execute(harness.member, { ...REQUEST, format: ReportFormat.Csv }),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.AccessFeatureNotIncluded,
    });
    expect(harness.bus.messages).toEqual([]);
  });

  it('refuses a range that ends before it starts', async () => {
    const harness = new RunsHarness();

    await expect(
      harness.create().execute(harness.member, {
        ...REQUEST,
        params: { ...REQUEST.params, from: '2026-11-15', to: '2026-11-01' },
      }),
    ).rejects.toMatchObject({ code: ReportsErrorCode.ParamsInvalidRange });
    expect(harness.bus.messages).toEqual([]);
  });
});
