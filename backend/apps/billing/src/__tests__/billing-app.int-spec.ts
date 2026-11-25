import {
  BillingCommand,
  BillingErrorCode,
  BillingEvent,
  BillingTenantDirectoryOperations,
  CheckQuotaOperation,
  CloseAccountOperation,
  type Invoice,
  type InvoiceChangePage,
  type InvoicePage,
  InvoiceStatus,
  ListInvoiceChangesOperation,
  MarkInvoiceFailedOperation,
  MarkInvoicePaidOperation,
  OpenAccountOperation,
  type PlanCatalog,
  type Subscription,
  SubscriptionStatus,
  UsageMetric,
  type UsageOverview,
} from '@contracts/billing';
import { IdentityEvent, MembershipChangeKind } from '@contracts/identity';
import { JobScheduleKind, type CronJobSchedule } from '@platform/kernel';
import { ContainerRuntime, JobContexts } from '@platform/kernel/test-utils';
import { DispatchOutcome, MessageDispatcher } from '@platform/messaging';
import { CronExpression } from '@platform/scheduling';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { ProvisionedService } from '@platform/service/test-utils';
import { TenantStatus } from '@platform/sharding';
import { TenantDirectoryRehearsal } from '@platform/tenant-move/test-utils';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { CloseInvoicePeriodsJob } from '../modules/invoices/application/close-invoice-periods.job.js';
import { IssueInvoice } from '../modules/invoices/application/issue-invoice.use-case.js';
import { AdvanceDunningJob } from '../modules/subscriptions/application/advance-dunning.job.js';
import { BillingTestApp } from './utils/index.js';

const OWNER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const TENANT_A = BillingTestApp.TENANT_A;
const TENANT_B = BillingTestApp.TENANT_B;
const TENANT_C = BillingTestApp.TENANT_C;
const TENANT_D = BillingTestApp.TENANT_D;
const TENANT_E = BillingTestApp.TENANT_E;
const TENANT_F = BillingTestApp.TENANT_F;
const TENANT_G = BillingTestApp.TENANT_G;
const HOUR_MS = 60 * 60_000;
const MISSING_PLAN = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const TODAY_UTC = `(now() AT TIME ZONE 'UTC')::date`;

new ContainerRuntime(process.env).describeIfAvailable(
  'billing on two shards',
  () => {
    jest.setTimeout(300_000);
    const app = new BillingTestApp();

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const open = (tenantId: string) =>
      app
        .internal()
        .invoke(OpenAccountOperation, { tenantId, ownerUserId: OWNER });

    const published = (tenantId: string, type: string) =>
      app.rowsOf<{ envelope: { data: Record<string, unknown> } }>(
        tenantId,
        `SELECT envelope FROM outbox WHERE envelope->>'type' = '${type}' AND envelope->>'tenantid' = '${tenantId}' ORDER BY seq`,
      );

    it('opens a trial account in the shard of each tenant once, however many times the saga asks', async () => {
      const first = await open(TENANT_A);
      const again = await open(TENANT_A);
      await open(TENANT_B);

      expect(first).toMatchObject({
        kind: CallOutcomeKind.Success,
        value: { tenantId: TENANT_A, status: SubscriptionStatus.Trialing },
      });
      expect(again).toEqual(first);
      await expect(
        app.rowsOf(TENANT_A, `SELECT tenant_id FROM subscriptions`),
      ).resolves.toEqual([{ tenant_id: TENANT_A }]);
      await expect(
        app.rowsOf(TENANT_B, `SELECT tenant_id FROM subscriptions`),
      ).resolves.toEqual([{ tenant_id: TENANT_B }]);
      await expect(
        published(TENANT_A, BillingEvent.EntitlementsChanged),
      ).resolves.toHaveLength(1);
    });

    it('lists the seeded plans and moves the trial to another plan without proration', async () => {
      const owner = await app.clientOf({ userId: OWNER, tenantId: TENANT_A });
      const plans = (await owner.get('/v1/billing/plans')).body as PlanCatalog;
      const pro = plans.items.find((plan) => plan.name === 'Pro');

      const changed = await owner.put('/v1/billing/subscription/plan', {
        body: { planId: pro?.id },
      });

      expect(plans.items.map((plan) => plan.name)).toEqual([
        'Inicio',
        'Empresa',
        'Pro',
      ]);
      expect(changed.status).toBe(200);
      expect((changed.body as Subscription).plan.name).toBe('Pro');
      await expect(
        app.rowsOf(TENANT_A, `SELECT proration_minor FROM subscriptions`),
      ).resolves.toEqual([{ proration_minor: '0' }]);
      await expect(
        published(TENANT_A, BillingEvent.SubscriptionChanged),
      ).resolves.toHaveLength(2);
    });

    it('counts a usage batch once by its keys and shows it against the plan limit', async () => {
      const owner = await app.clientOf({ userId: OWNER, tenantId: TENANT_A });
      const windowStart = new Date().toISOString();
      const batch = EnvelopeBuilder.anEnvelope({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e01',
        type: BillingCommand.RecordUsage,
        source: 'tasks',
        tenantid: TENANT_A,
        data: {
          tenantId: TENANT_A,
          records: [
            {
              metric: UsageMetric.ApiCalls,
              quantity: 40,
              windowStart,
              key: `tasks:${TENANT_A}:api_calls:${windowStart}`,
            },
          ],
        },
      });
      const dispatcher = app.get(MessageDispatcher);

      const delivered = await dispatcher.dispatch(batch, { receiveCount: 1 });
      await dispatcher.dispatch(
        { ...batch, id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e02' },
        { receiveCount: 1 },
      );
      const usage = (await owner.get('/v1/billing/usage'))
        .body as UsageOverview;
      const quota = await app.internal().invoke(CheckQuotaOperation, {
        tenantId: TENANT_A,
        metric: UsageMetric.ApiCalls,
        requested: 99_961,
      });

      expect(delivered.outcome).toBe(DispatchOutcome.Processed);
      expect(usage.items).toContainEqual({
        metric: UsageMetric.ApiCalls,
        limit: 100_000,
        used: 40,
      });
      expect(quota).toMatchObject({
        value: { limit: 100_000, used: 40, allowed: false },
      });
    });

    it('refuses to move to a plan whose limit the usage of the period already exceeds', async () => {
      const owner = await app.clientOf({ userId: OWNER, tenantId: TENANT_A });
      const windowStart = new Date().toISOString();
      await app.get(MessageDispatcher).dispatch(
        EnvelopeBuilder.anEnvelope({
          id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e03',
          type: BillingCommand.RecordUsage,
          source: 'tasks',
          tenantid: TENANT_A,
          data: {
            tenantId: TENANT_A,
            records: [
              {
                metric: UsageMetric.ApiCalls,
                quantity: 20_000,
                windowStart,
                key: `tasks:${TENANT_A}:api_calls:${windowStart}:burst`,
              },
            ],
          },
        }),
        { receiveCount: 1 },
      );
      const plans = (await owner.get('/v1/billing/plans')).body as PlanCatalog;
      const start = plans.items.find((plan) => plan.name === 'Inicio');

      const refused = await owner.put('/v1/billing/subscription/plan', {
        body: { planId: start?.id },
      });

      expect(refused.status).toBe(409);
      expect(refused.body).toMatchObject({
        code: BillingErrorCode.PlanUsageExceedsLimit,
      });
    });

    it('counts the members identity adds as billable users and stops counting the ones it removes', async () => {
      const owner = await app.clientOf({ userId: OWNER, tenantId: TENANT_B });
      const changedAt = new Date().toISOString();
      const member = (
        id: string,
        userId: string,
        kind = MembershipChangeKind.Added,
      ) =>
        EnvelopeBuilder.anEnvelope({
          id,
          type: IdentityEvent.MembershipChanged,
          source: 'identity',
          tenantid: TENANT_B,
          data: {
            tenantId: TENANT_B,
            userId,
            kind,
            groupIds: [],
            changedAt,
          },
        });
      const dispatcher = app.get(MessageDispatcher);

      await dispatcher.dispatch(
        member('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e11', OWNER),
        { receiveCount: 1 },
      );
      await dispatcher.dispatch(
        member(
          '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e12',
          '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02',
        ),
        { receiveCount: 1 },
      );

      const usage = (await owner.get('/v1/billing/usage'))
        .body as UsageOverview;
      await dispatcher.dispatch(
        member(
          '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e13',
          '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02',
          MembershipChangeKind.Removed,
        ),
        { receiveCount: 1 },
      );
      const afterRemoval = (await owner.get('/v1/billing/usage'))
        .body as UsageOverview;

      expect(usage.items).toContainEqual({
        metric: UsageMetric.Users,
        limit: 5,
        used: 2,
      });
      expect(afterRemoval.items).toContainEqual({
        metric: UsageMetric.Users,
        limit: 5,
        used: 1,
      });
    });

    it('ends the trial, invoices the next period, falls past due, is suspended after the grace days and comes back once every failed invoice is paid', async () => {
      const owner = await app.clientOf({ userId: OWNER, tenantId: TENANT_A });
      const closing = app.get(CloseInvoicePeriodsJob);
      await app.rowsOf(
        TENANT_A,
        `UPDATE subscriptions SET period_start = '2026-01-01', period_end = '2026-01-14'`,
      );

      await closing.run(JobContexts.live());
      const afterTrial = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;
      await closing.run(JobContexts.live());
      const [summary] = (
        (await owner.get('/v1/billing/invoices')).body as InvoicePage
      ).items;
      const invoice = (
        await owner.get(`/v1/billing/invoices/${String(summary?.id)}`)
      ).body as Invoice;

      expect(afterTrial).toMatchObject({
        status: SubscriptionStatus.Active,
        period: { start: '2026-01-15', end: '2026-02-14' },
      });
      expect(invoice).toMatchObject({
        number: 'FAC-000001',
        period: { start: '2026-01-15', end: '2026-02-14' },
        status: InvoiceStatus.Issued,
        total: { amountMinor: 189_000, currency: 'COP' },
      });

      const failed = await app.internal().invoke(MarkInvoiceFailedOperation, {
        tenantId: TENANT_A,
        invoiceId: invoice.id,
        failedAt: new Date().toISOString(),
      });
      const next = await app
        .get(IssueInvoice)
        .execute(TENANT_A, new Date().toISOString().slice(0, 10));
      await app.internal().invoke(MarkInvoiceFailedOperation, {
        tenantId: TENANT_A,
        invoiceId: String(next?.id),
        failedAt: new Date().toISOString(),
      });
      await app.rowsOf(
        TENANT_A,
        `UPDATE subscriptions SET past_due_since = now() - interval '${BillingTestApp.GRACE_DAYS + 1} days'`,
      );
      await open(TENANT_D);
      await app.rowsOf(
        TENANT_D,
        `UPDATE subscriptions SET status = '${SubscriptionStatus.PastDue}', plan_id = '${MISSING_PLAN}', past_due_since = now() - interval '${BillingTestApp.GRACE_DAYS + 1} days' WHERE tenant_id = '${TENANT_D}'`,
      );
      await expect(app.get(AdvanceDunningJob).run()).resolves.toBeUndefined();
      const suspended = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;
      const plans = (await owner.get('/v1/billing/plans')).body as PlanCatalog;
      const refused = await owner.put('/v1/billing/subscription/plan', {
        body: { planId: plans.items[0]?.id },
      });

      expect(failed).toMatchObject({ value: { status: InvoiceStatus.Failed } });
      expect(suspended.status).toBe(SubscriptionStatus.Suspended);
      await expect(
        app.rowsOf(
          TENANT_D,
          `SELECT status FROM subscriptions WHERE tenant_id = '${TENANT_D}'`,
        ),
      ).resolves.toEqual([{ status: SubscriptionStatus.PastDue }]);
      await expect(
        published(TENANT_A, BillingEvent.SubscriptionSuspended),
      ).resolves.toHaveLength(1);
      expect(refused.status).toBe(409);
      expect(refused.body).toMatchObject({
        code: BillingErrorCode.SubscriptionNotChangeable,
      });

      const paid = await app.internal().invoke(MarkInvoicePaidOperation, {
        tenantId: TENANT_A,
        invoiceId: invoice.id,
        paidAt: new Date().toISOString(),
        reference: 'gateway-7781',
        amount: invoice.total,
      });
      const stillOwing = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;
      await app.internal().invoke(MarkInvoicePaidOperation, {
        tenantId: TENANT_A,
        invoiceId: String(next?.id),
        paidAt: new Date().toISOString(),
        reference: 'gateway-7782',
        amount: {
          amountMinor: Number(next?.totalMinor),
          currency: String(next?.currency),
        },
      });
      const reactivated = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;

      expect(paid).toMatchObject({ value: { status: InvoiceStatus.Paid } });
      expect(stillOwing.status).toBe(SubscriptionStatus.Suspended);
      expect(reactivated.status).toBe(SubscriptionStatus.Active);
      const [entitlements] = (
        await published(TENANT_A, BillingEvent.EntitlementsChanged)
      ).slice(-1);
      expect(entitlements?.envelope.data['features']).not.toEqual([]);
      await expect(
        published(TENANT_A, BillingEvent.SubscriptionReactivated),
      ).resolves.toHaveLength(1);
    });

    describe('a plan change in the middle of a period', () => {
      const changePlanMidPeriod = async (planName: string) => {
        const owner = await app.clientOf({
          userId: OWNER,
          tenantId: TENANT_C,
        });
        const plans = (await owner.get('/v1/billing/plans'))
          .body as PlanCatalog;
        await app.rowsOf(
          TENANT_C,
          `UPDATE subscriptions SET period_start = ${TODAY_UTC} - 20, period_end = ${TODAY_UTC} + 9`,
        );
        const changed = await owner.put('/v1/billing/subscription/plan', {
          body: {
            planId: plans.items.find((plan) => plan.name === planName)?.id,
          },
        });
        expect(changed.status).toBe(200);
        await app.rowsOf(
          TENANT_C,
          `UPDATE subscriptions SET period_start = period_start - 30, period_end = period_end - 30`,
        );
      };
      const invoiceTotals = () =>
        app.rowsOf<{ total_minor: string }>(
          TENANT_C,
          `SELECT total_minor FROM invoices WHERE tenant_id = '${TENANT_C}' ORDER BY number`,
        );

      beforeAll(async () => {
        await open(TENANT_C);
        await app.rowsOf(
          TENANT_C,
          `UPDATE subscriptions SET period_start = ${TODAY_UTC} - 40, period_end = ${TODAY_UTC} - 30`,
        );
        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());
      });

      it('charges the starting plan for the period plus the rest of the period at the price difference of an upgrade', async () => {
        await changePlanMidPeriod('Pro');

        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());

        await expect(invoiceTotals()).resolves.toEqual([
          { total_minor: String(49_900 + 46_367) },
        ]);
      });

      it('charges the upgraded plan for the next period less the credit of a downgrade', async () => {
        await changePlanMidPeriod('Inicio');

        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());

        await expect(invoiceTotals()).resolves.toEqual([
          { total_minor: String(49_900 + 46_367) },
          { total_minor: String(189_000 - 46_366) },
        ]);
      });

      it('charges an invoice that was issued but never charged, and only once', async () => {
        await app.rowsOf(
          TENANT_C,
          `UPDATE subscriptions SET period_start = ${TODAY_UTC} - 40, period_end = ${TODAY_UTC} - 10`,
        );
        const uncharged = await app
          .get(IssueInvoice)
          .execute(TENANT_C, new Date().toISOString().slice(0, 10));
        const attemptsOf = () =>
          app.rowsOf<{ count: string }>(
            TENANT_C,
            `SELECT count(*) FROM payment_attempts WHERE invoice_id = '${String(uncharged?.id)}'`,
          );
        const attemptsBefore = await attemptsOf();

        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());
        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());

        expect(attemptsBefore).toEqual([{ count: '0' }]);
        await expect(attemptsOf()).resolves.toEqual([{ count: '1' }]);
        await expect(
          app.rowsOf(
            TENANT_C,
            `SELECT invoice_id FROM payment_attempts WHERE tenant_id = '${TENANT_C}' GROUP BY invoice_id HAVING count(*) > 1`,
          ),
        ).resolves.toEqual([]);
      });
    });

    describe('collecting without charging twice or charging what was not used', () => {
      const today = () => new Date().toISOString().slice(0, 10);
      const issueOverdue = (tenantId: string, daysAgo: number) =>
        app.rowsOf(
          tenantId,
          `UPDATE subscriptions SET status = '${SubscriptionStatus.Active}', period_start = ${TODAY_UTC} - ${daysAgo}, period_end = ${TODAY_UTC} - ${daysAgo - 29}`,
        );
      const attemptsOf = (tenantId: string, invoiceId: string) =>
        app.rowsOf<{
          attempt: number;
          status: string;
          reference: string | null;
          reason: string | null;
        }>(
          tenantId,
          `SELECT attempt, status, reference, reason FROM payment_attempts WHERE invoice_id = '${invoiceId}' ORDER BY attempt`,
        );
      const statusOf = async (tenantId: string) =>
        (
          await app.rowsOf<{ status: string }>(
            tenantId,
            `SELECT status FROM subscriptions WHERE tenant_id = '${tenantId}'`,
          )
        )[0]?.status;

      it('closes periods within the hour of a restart, whatever the time of the restart', () => {
        const restart = new Date('2026-12-01T13:47:00.000Z');
        const schedule = app.get(CloseInvoicePeriodsJob).schedule;

        expect(schedule).toMatchObject({ kind: JobScheduleKind.Cron });
        const next = CronExpression.parse(
          (schedule as CronJobSchedule).expression,
        ).nextAfter(restart);
        expect(next.getTime() - restart.getTime()).toBeLessThanOrEqual(HOUR_MS);
      });

      it('stops collecting once its run is past the deadline, so another replica can take over', async () => {
        await open(TENANT_F);
        await issueOverdue(TENANT_F, 40);
        const issued = await app.get(IssueInvoice).execute(TENANT_F, today());

        await expect(
          app.get(CloseInvoicePeriodsJob).run(JobContexts.aborted()),
        ).rejects.toMatchObject({ name: 'AbortError' });

        await expect(attemptsOf(TENANT_F, String(issued?.id))).resolves.toEqual(
          [],
        );
      });

      it('charges an invoice once when two replicas collect it at the same time', async () => {
        const [invoice] = await app.rowsOf<{ id: string }>(
          TENANT_F,
          `SELECT id FROM invoices WHERE tenant_id = '${TENANT_F}' AND status = '${InvoiceStatus.Issued}'`,
        );

        await Promise.all([
          app.get(CloseInvoicePeriodsJob).run(JobContexts.live('replica-a')),
          app.get(CloseInvoicePeriodsJob).run(JobContexts.live('replica-b')),
        ]);

        await expect(
          attemptsOf(TENANT_F, String(invoice?.id)),
        ).resolves.toHaveLength(1);
      });

      it('keeps the reason of a decline and charges the invoice again when its retry is due', async () => {
        const [invoice] = await app.rowsOf<{ id: string }>(
          TENANT_F,
          `SELECT id FROM invoices WHERE tenant_id = '${TENANT_F}' AND status = '${InvoiceStatus.Issued}'`,
        );
        await app.internal().invoke(MarkInvoiceFailedOperation, {
          tenantId: TENANT_F,
          invoiceId: String(invoice?.id),
          failedAt: new Date().toISOString(),
          reason: 'insufficient_funds',
        });
        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());
        const beforeRetry = await attemptsOf(TENANT_F, String(invoice?.id));
        await app.rowsOf(
          TENANT_F,
          `UPDATE invoices SET next_collection_at = now() - interval '1 minute' WHERE id = '${String(invoice?.id)}'`,
        );

        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());

        expect(beforeRetry).toEqual([
          {
            attempt: 1,
            status: 'declined',
            reference: null,
            reason: 'insufficient_funds',
          },
        ]);
        await expect(
          attemptsOf(TENANT_F, String(invoice?.id)),
        ).resolves.toMatchObject([
          { attempt: 1, status: 'declined' },
          { attempt: 2, status: 'pending' },
        ]);
      });

      it('refuses a payment for an amount other than the total and keeps the reference of the one that matches', async () => {
        await open(TENANT_G);
        await issueOverdue(TENANT_G, 40);
        const issued = await app.get(IssueInvoice).execute(TENANT_G, today());
        const paid = {
          tenantId: TENANT_G,
          invoiceId: String(issued?.id),
          paidAt: new Date().toISOString(),
          reference: 'gateway-9001',
        };

        const short = await app.internal().invoke(MarkInvoicePaidOperation, {
          ...paid,
          amount: {
            amountMinor: Number(issued?.totalMinor) - 1,
            currency: String(issued?.currency),
          },
        });
        const exact = await app.internal().invoke(MarkInvoicePaidOperation, {
          ...paid,
          amount: {
            amountMinor: Number(issued?.totalMinor),
            currency: String(issued?.currency),
          },
        });

        expect(short).toMatchObject({
          kind: CallOutcomeKind.BusinessError,
          code: BillingErrorCode.InvoiceAmountMismatch,
        });
        expect(exact).toMatchObject({ value: { status: InvoiceStatus.Paid } });
        await expect(attemptsOf(TENANT_G, String(issued?.id))).resolves.toEqual(
          [
            {
              attempt: 1,
              status: 'approved',
              reference: 'gateway-9001',
              reason: null,
            },
          ],
        );
      });

      it('reactivates a suspended tenant when its failed invoices are paid at the same time', async () => {
        await open(TENANT_E);
        await issueOverdue(TENANT_E, 100);
        const issue = () => app.get(IssueInvoice).execute(TENANT_E, today());
        const owed = [await issue(), await issue(), await issue()];
        await Promise.all(
          owed.map((invoice) =>
            app.internal().invoke(MarkInvoiceFailedOperation, {
              tenantId: TENANT_E,
              invoiceId: String(invoice?.id),
              failedAt: new Date().toISOString(),
            }),
          ),
        );
        await app.rowsOf(
          TENANT_E,
          `UPDATE subscriptions SET status = '${SubscriptionStatus.Suspended}'`,
        );

        await Promise.all(
          owed.map((invoice) =>
            app.internal().invoke(MarkInvoicePaidOperation, {
              tenantId: TENANT_E,
              invoiceId: String(invoice?.id),
              paidAt: new Date().toISOString(),
              reference: `gateway-${String(invoice?.number)}`,
              amount: {
                amountMinor: Number(invoice?.totalMinor),
                currency: String(invoice?.currency),
              },
            }),
          ),
        );

        await expect(statusOf(TENANT_E)).resolves.toBe(
          SubscriptionStatus.Active,
        );
      });

      it('starts a new period on the day a tenant pays its way out of months of suspension, so those months are never invoiced', async () => {
        await issueOverdue(TENANT_G, 40);
        const owed = await app.get(IssueInvoice).execute(TENANT_G, today());
        await app.internal().invoke(MarkInvoiceFailedOperation, {
          tenantId: TENANT_G,
          invoiceId: String(owed?.id),
          failedAt: new Date().toISOString(),
        });
        await app.rowsOf(
          TENANT_G,
          `UPDATE subscriptions SET status = '${SubscriptionStatus.Suspended}', period_start = ${TODAY_UTC} - 200, period_end = ${TODAY_UTC} - 170`,
        );
        const invoicesBefore = await app.rowsOf(
          TENANT_G,
          `SELECT id FROM invoices WHERE tenant_id = '${TENANT_G}'`,
        );

        await app.internal().invoke(MarkInvoicePaidOperation, {
          tenantId: TENANT_G,
          invoiceId: String(owed?.id),
          paidAt: new Date().toISOString(),
          reference: 'gateway-late',
          amount: {
            amountMinor: Number(owed?.totalMinor),
            currency: String(owed?.currency),
          },
        });
        await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());

        await expect(
          app.rowsOf(
            TENANT_G,
            `SELECT status, period_start::text AS start FROM subscriptions WHERE tenant_id = '${TENANT_G}'`,
          ),
        ).resolves.toEqual([
          { status: SubscriptionStatus.Active, start: today() },
        ]);
        await expect(
          app.rowsOf(
            TENANT_G,
            `SELECT id FROM invoices WHERE tenant_id = '${TENANT_G}'`,
          ),
        ).resolves.toHaveLength(invoicesBefore.length);
      });
    });

    it('pages the invoices of a tenant, newest first, for the services that keep a copy', async () => {
      const pageOf = async (after?: string): Promise<InvoiceChangePage> => {
        const outcome = await app
          .internal()
          .invoke(ListInvoiceChangesOperation, {
            tenantId: TENANT_A,
            limit: 1,
            ...(after === undefined ? {} : { after }),
          });
        expect(outcome.kind).toBe(CallOutcomeKind.Success);
        return outcome.kind === CallOutcomeKind.Success
          ? (outcome.value as InvoiceChangePage)
          : { items: [], nextCursor: null };
      };

      const first = await pageOf();
      const second = await pageOf(first.nextCursor ?? undefined);
      const [newest] = first.items;
      const [older] = second.items;

      expect(first.nextCursor).toEqual(expect.any(String));
      expect(newest).toMatchObject({ issuedAt: expect.any(String) });
      expect(String(older?.id) < String(newest?.id)).toBe(true);
    });

    it('refuses to close an account that was already invoiced and closes one that was not', async () => {
      const invoiced = await app
        .internal()
        .invoke(CloseAccountOperation, { tenantId: TENANT_A });
      const fresh = await app
        .internal()
        .invoke(CloseAccountOperation, { tenantId: TENANT_B });

      expect(invoiced).toMatchObject({
        kind: CallOutcomeKind.BusinessError,
        code: BillingErrorCode.InvoiceInvalidState,
      });
      expect(fresh).toMatchObject({ kind: CallOutcomeKind.Success });
      await expect(
        app.rowsOf(
          TENANT_B,
          `SELECT 1 FROM subscriptions WHERE tenant_id = '${TENANT_B}'`,
        ),
      ).resolves.toEqual([]);
    });

    it('places a tenant onboarded by identity in the shard of its group once and takes it out when the onboarding is undone', async () => {
      const rehearsal = new TenantDirectoryRehearsal(
        BillingTenantDirectoryOperations,
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

    it('opens the account of a tenant that identity has just placed in its directory', async () => {
      const tenantId = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a77';

      const placed = await app.internal().invoke(
        BillingTenantDirectoryOperations.tenantDirectoryPlace,
        {
          tenantId,
          region: ProvisionedService.REGION,
          groups: [ProvisionedService.GROUPS[0]],
          dedicated: false,
        },
        tenantId,
      );
      const opened = await app
        .internal()
        .invoke(OpenAccountOperation, { tenantId, ownerUserId: OWNER });

      expect(placed.kind).toBe(CallOutcomeKind.Success);
      expect(opened).toMatchObject({
        kind: CallOutcomeKind.Success,
        value: { tenantId, status: SubscriptionStatus.Trialing },
      });
      await expect(
        app.servers
          .shards()[0]
          .rows(`SELECT 1 FROM subscriptions WHERE tenant_id = '${tenantId}'`),
      ).resolves.toHaveLength(1);
    });
  },
);
