import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportsErrorCode,
  ReportType,
} from '@contracts/reports';
import { RunsHarness } from '../../__tests__/utils/index.js';

const TENANT = RunsHarness.TENANT;
const DAY_MS = 86_400_000;
const UNKNOWN = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9fff';

const request = (
  format = ReportFormat.Json,
  type = ReportType.TasksByStatus,
) => ({
  type,
  format,
  params: {
    from: '2026-11-01',
    to: '2026-11-15',
    granularity: ReportGranularity.Day,
  },
});

async function ready(
  harness: RunsHarness,
  format = ReportFormat.Json,
): Promise<string> {
  const { runId } = await harness
    .create()
    .execute(harness.member, request(format));
  await harness.execute().execute({ tenantId: TENANT, runId });
  return runId;
}

describe('RunQueries', () => {
  it('lists the runs newest first, a page at a time, until the last one', async () => {
    const harness = new RunsHarness();
    const created: string[] = [];
    for (let i = 0; i < 3; i++) {
      created.push(
        (await harness.create().execute(harness.member, request())).runId,
      );
    }

    const first = await harness.queries().list(TENANT, { limit: 2 });
    const second = await harness
      .queries()
      .list(TENANT, { limit: 2, after: first.nextCursor ?? undefined });

    expect(first.items.map((item) => item.id)).toEqual([
      created[2],
      created[1],
    ]);
    expect(first.nextCursor).not.toBeNull();
    expect(second.items.map((item) => item.id)).toEqual([created[0]]);
    expect(second.nextCursor).toBeNull();
  });

  it('lists only the runs of the requested status', async () => {
    const harness = new RunsHarness();
    const done = await ready(harness);
    await harness.create().execute(harness.member, request());

    const page = await harness
      .queries()
      .list(TENANT, { status: ReportRunStatus.Ready });

    expect(page.items.map((item) => item.id)).toEqual([done]);
  });

  it('shows a ready run with its result and a queued one without it', async () => {
    const harness = new RunsHarness();
    const done = await ready(harness);
    const { runId: queued } = await harness
      .create()
      .execute(harness.member, request());

    const detail = await harness.queries().get(TENANT, done);
    const pending = await harness.queries().get(TENANT, queued);

    expect(detail).toMatchObject({ status: ReportRunStatus.Ready });
    expect(detail.result?.rows).toEqual([{ cells: ['done', '3'] }]);
    expect(pending).toMatchObject({ status: ReportRunStatus.Queued });
    expect(pending.result).toBeNull();
  });

  it('downloads a ready run as CSV with a name from its type and range', async () => {
    const harness = new RunsHarness();
    const runId = await ready(harness, ReportFormat.Csv);

    const file = await harness.queries().download(TENANT, runId);

    expect(file.fileName).toBe(
      `${ReportType.TasksByStatus}-2026-11-01-2026-11-15.csv`,
    );
    expect(file.contentType).toContain('text/csv');
    expect(file.content).toContain('done');
  });

  it('refuses to download a run that is not ready yet', async () => {
    const harness = new RunsHarness();
    const { runId } = await harness.create().execute(harness.member, request());

    await expect(
      harness.queries().download(TENANT, runId),
    ).rejects.toMatchObject({
      code: ReportsErrorCode.RunNotReady,
    });
  });

  it('refuses to download a run whose result already expired', async () => {
    const harness = new RunsHarness();
    const runId = await ready(harness);
    harness.clock.advance(8 * DAY_MS);

    await expect(
      harness.queries().download(TENANT, runId),
    ).rejects.toMatchObject({
      code: ReportsErrorCode.RunExpired,
    });
  });

  it('refuses to download a ready run whose stored result is gone', async () => {
    const harness = new RunsHarness();
    const runId = await ready(harness);
    await harness.results.discard(runId);

    await expect(
      harness.queries().download(TENANT, runId),
    ).rejects.toMatchObject({
      code: ReportsErrorCode.RunNotReady,
    });
  });

  it('reports a run the tenant does not have', async () => {
    const harness = new RunsHarness();

    await expect(harness.queries().get(TENANT, UNKNOWN)).rejects.toMatchObject({
      code: ReportsErrorCode.RunNotFound,
    });
  });
});
