import { BillingEvent, Currency, InvoiceStatus } from '@contracts/billing';
import { PlanFeature } from '@contracts/identity';
import {
  NotificationChannel,
  NotificationsEvent,
  NotificationType,
} from '@contracts/notifications';
import { PlatformErrorCode } from '@contracts/platform';
import {
  EraseReportsUserDataOperation,
  type ReportDownload,
  ReportFormat,
  ReportGranularity,
  type ReportRunCreated,
  type ReportRunDetail,
  ReportRunStatus,
  ReportsCommand,
  ReportsErrorCode,
  ReportsEvent,
  ReportsTenantDirectoryOperations,
  ReportType,
} from '@contracts/reports';
import { TaskField, TasksEvent, TaskStatus } from '@contracts/tasks';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { ProvisionedService } from '@platform/service/test-utils';
import { TenantStatus } from '@platform/sharding';
import { TenantDirectoryRehearsal } from '@platform/tenant-move/test-utils';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { BackfillProjectionsJob } from '../modules/projections/application/backfill-projections.job.js';
import { BackfillSource } from '../modules/projections/domain/backfill-progress.js';
import { ExpireRunsJob } from '../modules/runs/application/expire-runs.job.js';
import { ReportsTestApp } from './utils/index.js';

const ANA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
/** Another person: the service caches each user's access by permission version. */
const BEA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02';
const TENANT_A = ReportsTestApp.TENANT_A;
const TENANT_B = ReportsTestApp.TENANT_B;
const NOVEMBER = { from: '2026-11-01', to: '2026-11-30' };
const author = { userId: ANA, homeTenantId: TENANT_A };

let messageSeq = 0;
const envelope = (type: string, tenantId: string, data: object) => {
  messageSeq += 1;
  return EnvelopeBuilder.anEnvelope({
    id: `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e${String(messageSeq).padStart(4, '0')}`,
    type,
    source: 'test',
    tenantid: tenantId,
    data,
  });
};
const taskId = (n: number) =>
  `0192f1b4-7c3a-7d2e-9a41-5b6c7d8f${String(n).padStart(4, '0')}`;

new ContainerRuntime(process.env).describeIfAvailable(
  'reports on two shards',
  () => {
    jest.setTimeout(300_000);
    const app = new ReportsTestApp();

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const runReport = async (
      tenantId: string,
      body: object,
      requester: { userId: string; features: PlanFeature[] } = {
        userId: ANA,
        features: [],
      },
    ) => {
      const member = await app.clientOf({ ...requester, tenantId });
      const created = await member.post('/v1/reports/runs', { body });
      await app.deliverOutbox(tenantId, ReportsCommand.ExecuteRun);
      const { runId } = created.body as ReportRunCreated;
      return {
        member,
        created,
        runId,
        detail: async () =>
          (await member.get(`/v1/reports/runs/${runId}`))
            .body as ReportRunDetail,
      };
    };

    it('projects task events in any order and counts the live tasks by status', async () => {
      await app.deliver(
        envelope(TasksEvent.TaskUpdated, TENANT_A, {
          tenantId: TENANT_A,
          taskId: taskId(1),
          changedFields: [TaskField.Status],
          statusBefore: TaskStatus.InProgress,
          statusAfter: TaskStatus.Done,
          version: 3,
          actor: author,
          createdBy: author,
          updatedAt: '2026-11-12T10:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(TasksEvent.TaskCreated, TENANT_A, {
          tenantId: TENANT_A,
          taskId: taskId(1),
          status: TaskStatus.Open,
          version: 1,
          createdBy: author,
          createdAt: '2026-11-10T10:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(TasksEvent.TaskCreated, TENANT_A, {
          tenantId: TENANT_A,
          taskId: taskId(2),
          status: TaskStatus.Open,
          version: 1,
          createdBy: author,
          createdAt: '2026-11-11T10:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(TasksEvent.TaskCreated, TENANT_A, {
          tenantId: TENANT_A,
          taskId: taskId(3),
          status: TaskStatus.Open,
          version: 1,
          createdBy: author,
          createdAt: '2026-11-11T11:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(TasksEvent.TaskDeleted, TENANT_A, {
          tenantId: TENANT_A,
          taskId: taskId(3),
          status: TaskStatus.Open,
          version: 2,
          actor: author,
          deletedAt: '2026-11-13T10:00:00.000Z',
        }),
      );

      const run = await runReport(TENANT_A, {
        type: ReportType.TasksByStatus,
        format: ReportFormat.Json,
        params: { ...NOVEMBER, granularity: ReportGranularity.Month },
      });
      const detail = await run.detail();

      expect(run.created.status).toBe(202);
      expect(detail.status).toBe(ReportRunStatus.Ready);
      expect(detail.result?.rows).toEqual([
        { cells: [TaskStatus.Open, '1'] },
        { cells: [TaskStatus.InProgress, '0'] },
        { cells: [TaskStatus.Done, '1'] },
      ]);
      await expect(
        app.rowsOf(
          TENANT_A,
          `SELECT envelope->'data'->>'status' AS status FROM outbox WHERE envelope->>'type' = '${ReportsEvent.RunCompleted}'`,
        ),
      ).resolves.toEqual([{ status: ReportRunStatus.Ready }]);
    });

    it('summarizes invoices and notifications by period from billing and notifications events', async () => {
      const total = { amountMinor: 189_000, currency: Currency.Cop };
      const invoiceId = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
      await app.deliver(
        envelope(BillingEvent.InvoicePaid, TENANT_B, {
          tenantId: TENANT_B,
          invoiceId,
          number: 'FAC-000001',
          total,
          paidAt: '2026-11-03T10:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(BillingEvent.InvoiceIssued, TENANT_B, {
          tenantId: TENANT_B,
          invoiceId,
          number: 'FAC-000001',
          period: { start: '2026-10-01', end: '2026-10-31' },
          total,
          issuedAt: '2026-11-01T10:00:00.000Z',
        }),
      );
      await app.deliver(
        envelope(NotificationsEvent.NotificationCreated, TENANT_B, {
          notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d11',
          tenantId: TENANT_B,
          type: NotificationType.InvoiceIssued,
          channels: [NotificationChannel.InApp, NotificationChannel.Email],
          createdAt: '2026-11-01T10:05:00.000Z',
        }),
      );

      const invoices = await runReport(TENANT_B, {
        type: ReportType.InvoicesSummary,
        format: ReportFormat.Json,
        params: { ...NOVEMBER, granularity: ReportGranularity.Month },
      });
      const deliveries = await runReport(TENANT_B, {
        type: ReportType.NotificationsDelivery,
        format: ReportFormat.Json,
        params: { ...NOVEMBER, granularity: ReportGranularity.Month },
      });

      expect((await invoices.detail()).result?.rows).toEqual([
        { cells: ['2026-11-01', Currency.Cop, '1', '1', '0', '189000'] },
      ]);
      expect((await deliveries.detail()).result?.rows).toEqual([
        {
          cells: ['2026-11-01', NotificationType.InvoiceIssued, '1', '0', '1'],
        },
      ]);
    });

    it('exports to CSV only for a plan with advanced reports', async () => {
      const body = {
        type: ReportType.TasksByStatus,
        format: ReportFormat.Csv,
        params: { ...NOVEMBER, granularity: ReportGranularity.Month },
      };
      const basic = await app.clientOf({ userId: ANA, tenantId: TENANT_A });

      const refused = await basic.post('/v1/reports/runs', { body });
      const advanced = await runReport(TENANT_A, body, {
        userId: BEA,
        features: [PlanFeature.AdvancedReports],
      });
      const download = (
        await advanced.member.get(`/v1/reports/runs/${advanced.runId}/download`)
      ).body as ReportDownload;

      expect(refused.status).toBe(403);
      expect(refused.body).toMatchObject({
        code: PlatformErrorCode.AccessFeatureNotIncluded,
      });
      expect(download).toEqual({
        fileName: `${ReportType.TasksByStatus}-2026-11-01-2026-11-30.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: 'Estado,Tareas\r\nopen,1\r\nin_progress,0\r\ndone,1',
      });
    });

    it('rejects a range that ends before it starts', async () => {
      const member = await app.clientOf({ userId: ANA, tenantId: TENANT_A });

      const response = await member.post('/v1/reports/runs', {
        body: {
          type: ReportType.TasksActivity,
          format: ReportFormat.Json,
          params: {
            from: '2026-11-30',
            to: '2026-11-01',
            granularity: ReportGranularity.Day,
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: ReportsErrorCode.ParamsInvalidRange,
      });
    });

    it('fails a run whose result is larger than the maximum', async () => {
      for (let day = 1; day <= 60; day += 1) {
        await app.deliver(
          envelope(TasksEvent.TaskCreated, TENANT_A, {
            tenantId: TENANT_A,
            taskId: taskId(100 + day),
            status: TaskStatus.Open,
            version: 1,
            createdBy: author,
            createdAt: new Date(
              Date.UTC(2026, 8, 1) + day * 86_400_000,
            ).toISOString(),
          }),
        );
      }

      const run = await runReport(TENANT_A, {
        type: ReportType.TasksActivity,
        format: ReportFormat.Json,
        params: {
          from: '2026-09-01',
          to: '2026-10-31',
          granularity: ReportGranularity.Day,
        },
      });
      const download = await run.member.get(
        `/v1/reports/runs/${run.runId}/download`,
      );

      expect((await run.detail()).status).toBe(ReportRunStatus.Failed);
      expect(download.status).toBe(409);
      expect(download.body).toMatchObject({
        code: ReportsErrorCode.RunNotReady,
      });
    });

    describe('the backfill of the tenants that existed before reports', () => {
      const october = { from: '2026-10-01', to: '2026-10-31' };
      const invoiceId = (n: number) =>
        `0192f1b4-7c3a-7d2e-9a41-5b6c7d8c${String(n).padStart(4, '0')}`;
      const invoice = (n: number, status: InvoiceStatus) => ({
        id: invoiceId(n),
        number: `FAC-00000${n}`,
        period: { start: '2026-09-01', end: '2026-09-30' },
        status,
        currency: Currency.Cop,
        total: { amountMinor: 49_900, currency: Currency.Cop },
        issuedAt: '2026-10-01T10:00:00.000Z',
        paidAt:
          status === InvoiceStatus.Paid ? '2026-10-02T10:00:00.000Z' : null,
      });
      let pagesAfterFirstRun = 0;

      beforeAll(async () => {
        app.peers.tasksOf(
          TENANT_B,
          Array.from({ length: 250 }, (_unused, index) => ({
            id: taskId(1000 + index),
            title: `Tarea ${index}`,
            description: '',
            status: index === 0 ? TaskStatus.Open : TaskStatus.Done,
            version: 2,
            createdAt: '2026-11-05T10:00:00.000Z',
            updatedAt: '2026-11-06T10:00:00.000Z',
            createdBy: author,
            deletedAt: null,
          })),
        );
        app.peers.invoicesOf(TENANT_A, [
          invoice(3, InvoiceStatus.Issued),
          invoice(2, InvoiceStatus.Failed),
          invoice(1, InvoiceStatus.Paid),
        ]);
        await app.deliver(
          envelope(TasksEvent.TaskUpdated, TENANT_B, {
            tenantId: TENANT_B,
            taskId: taskId(1000),
            changedFields: [TaskField.Status],
            statusBefore: TaskStatus.Open,
            statusAfter: TaskStatus.InProgress,
            version: 3,
            actor: author,
            createdBy: author,
            updatedAt: '2026-11-07T10:00:00.000Z',
          }),
        );
        await app.deliver(
          envelope(BillingEvent.InvoicePaid, TENANT_A, {
            tenantId: TENANT_A,
            invoiceId: invoiceId(3),
            number: 'FAC-000003',
            total: { amountMinor: 49_900, currency: Currency.Cop },
            paidAt: '2026-10-03T10:00:00.000Z',
          }),
        );

        await app.get(BackfillProjectionsJob).run();
        pagesAfterFirstRun = app.peers.pagesServed;
        await app.get(BackfillProjectionsJob).run();
      });

      it('backfills the tasks of a tenant from tasks once and mixes them with newer events', async () => {
        const run = await runReport(TENANT_B, {
          type: ReportType.TasksByStatus,
          format: ReportFormat.Json,
          params: { ...NOVEMBER, granularity: ReportGranularity.Month },
        });

        expect((await run.detail()).result?.rows).toEqual([
          { cells: [TaskStatus.Open, '0'] },
          { cells: [TaskStatus.InProgress, '1'] },
          { cells: [TaskStatus.Done, '249'] },
        ]);
        expect(app.peers.pagesServed).toBe(pagesAfterFirstRun);
        await expect(
          app.rowsOf(
            TENANT_B,
            `SELECT source, completed FROM proj_backfills ORDER BY source`,
          ),
        ).resolves.toEqual([
          { source: BackfillSource.Invoices, completed: true },
          { source: BackfillSource.Tasks, completed: true },
        ]);
      });

      it('counts the backfilled tasks that were already done as completed on their last change', async () => {
        const run = await runReport(TENANT_B, {
          type: ReportType.TasksActivity,
          format: ReportFormat.Json,
          params: { ...NOVEMBER, granularity: ReportGranularity.Day },
        });

        expect((await run.detail()).result?.rows).toEqual([
          { cells: ['2026-11-05', '250', '0'] },
          { cells: ['2026-11-06', '0', '249'] },
        ]);
      });

      it('summarizes the invoices billing issued before reports without undoing a newer payment', async () => {
        const run = await runReport(TENANT_A, {
          type: ReportType.InvoicesSummary,
          format: ReportFormat.Json,
          params: { ...october, granularity: ReportGranularity.Month },
        });

        expect((await run.detail()).result?.rows).toEqual([
          {
            cells: [
              '2026-10-01',
              Currency.Cop,
              '3',
              '2',
              '1',
              String(3 * 49_900),
            ],
          },
        ]);
      });
    });

    it('expires the result of an old run and answers its download with 410', async () => {
      const run = await runReport(TENANT_A, {
        type: ReportType.TasksByStatus,
        format: ReportFormat.Json,
        params: { ...NOVEMBER, granularity: ReportGranularity.Week },
      });
      await app.rowsOf(
        TENANT_A,
        `UPDATE report_runs SET expires_at = now() - interval '1 day' WHERE id = '${run.runId}'`,
      );

      await app.get(ExpireRunsJob).run();
      const download = await run.member.get(
        `/v1/reports/runs/${run.runId}/download`,
      );

      expect((await run.detail()).status).toBe(ReportRunStatus.Expired);
      await expect(
        app.rowsOf(
          TENANT_A,
          `SELECT result FROM report_runs WHERE id = '${run.runId}'`,
        ),
      ).resolves.toEqual([{ result: null }]);
      expect(download.status).toBe(410);
    });

    it('erases the requester from the runs of every shard and repeats without error', async () => {
      const first = await app
        .internal()
        .invoke(EraseReportsUserDataOperation, { user: author });
      const again = await app
        .internal()
        .invoke(EraseReportsUserDataOperation, { user: author });

      expect(first).toMatchObject({ kind: CallOutcomeKind.Success });
      expect(again).toMatchObject({ value: { affectedRows: 0 } });
      await expect(
        app.rowsOf(
          TENANT_A,
          `SELECT 1 FROM report_runs WHERE requested_by = '${ANA}'`,
        ),
      ).resolves.toEqual([]);
      await expect(
        app.rowsOf(
          TENANT_B,
          `SELECT 1 FROM report_runs WHERE requested_by = '${ANA}'`,
        ),
      ).resolves.toEqual([]);
    });

    it('places a tenant onboarded by identity in the shard of its group once and takes it out when the onboarding is undone', async () => {
      const rehearsal = new TenantDirectoryRehearsal(
        ReportsTenantDirectoryOperations,
        app.internal(),
        app.servers,
      );

      const report = await rehearsal.rehearse();

      expect(report.placements).toEqual([
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
      ]);
      expect(report.placedRows).toEqual([
        {
          region: ProvisionedService.REGION,
          shard_group: [rehearsal.expectedShard()],
          status: TenantStatus.Active,
        },
      ]);
      expect(report.removals).toEqual([
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
      ]);
      expect(report.rowsAfterRemoval).toEqual([]);
      expect(report.unknownGroup).toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: TenantMoveErrorCode.UnknownTarget,
      });
    });
  },
);
