import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportsErrorCode,
  ReportsEvent,
  ReportType,
} from '@contracts/reports';
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

async function queued(harness: RunsHarness): Promise<string> {
  const { runId } = await harness.create().execute(harness.member, REQUEST);
  harness.bus.messages.length = 0;
  return runId;
}

describe('ExecuteRun', () => {
  it('computes the rows, stores the result and announces the ready run', async () => {
    const harness = new RunsHarness();
    const runId = await queued(harness);

    await harness.execute().execute({ tenantId: RunsHarness.TENANT, runId });

    expect(harness.runs.stateOf(runId)?.status).toBe(ReportRunStatus.Ready);
    expect(harness.results.saved.get(runId)?.rows).toEqual([
      { cells: ['done', '3'] },
    ]);
    expect(harness.bus.messages).toEqual([
      expect.objectContaining({
        type: ReportsEvent.RunCompleted,
        data: expect.objectContaining({ runId, status: ReportRunStatus.Ready }),
      }),
    ]);
  });

  it('fails a run whose result exceeds the size limit without storing it', async () => {
    const harness = new RunsHarness();
    harness.definitions.tasks.rowsToReturn = Array.from(
      { length: 200 },
      (_, index) => ({ cells: [`status ${index}`, `${index}`] }),
    );
    const runId = await queued(harness);

    await harness.execute().execute({ tenantId: RunsHarness.TENANT, runId });

    expect(harness.runs.stateOf(runId)).toMatchObject({
      status: ReportRunStatus.Failed,
      failureCode: ReportsErrorCode.ResultTooLarge,
    });
    expect(harness.results.saved.has(runId)).toBe(false);
  });

  it('does nothing for a run that is already finished, so a redelivered command computes it once', async () => {
    const harness = new RunsHarness();
    const runId = await queued(harness);
    await harness.execute().execute({ tenantId: RunsHarness.TENANT, runId });
    harness.bus.messages.length = 0;

    await harness.execute().execute({ tenantId: RunsHarness.TENANT, runId });

    expect(harness.bus.messages).toEqual([]);
  });
});
