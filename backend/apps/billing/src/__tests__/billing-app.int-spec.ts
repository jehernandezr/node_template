import {
  BillingCommand,
  BillingErrorCode,
  BillingEvent,
  CheckQuotaOperation,
  CloseAccountOperation,
  InvoiceStatus,
  ListInvoiceChangesOperation,
  MarkInvoiceFailedOperation,
  MarkInvoicePaidOperation,
  OpenAccountOperation,
  SubscriptionStatus,
  UsageMetric,
  type Invoice,
  type InvoiceChangePage,
  type InvoicePage,
  type PlanCatalog,
  type Subscription,
  type UsageOverview,
} from '@contracts/billing';
import { IdentityEvent, MembershipChangeKind } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DispatchOutcome, MessageDispatcher } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { CloseInvoicePeriodsJob } from '../modules/invoices/application/close-invoice-periods.job.js';
import { IssueInvoice } from '../modules/invoices/application/issue-invoice.use-case.js';
import { AdvanceDunningJob } from '../modules/subscriptions/application/advance-dunning.job.js';
import { BillingTestApp } from './utils/index.js';

const OWNER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const TENANT_A = BillingTestApp.TENANT_A;
const TENANT_B = BillingTestApp.TENANT_B;
const TENANT_C = BillingTestApp.TENANT_C;
const TENANT_D = BillingTestApp.TENANT_D;
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

      await closing.run();
      const afterTrial = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;
      await closing.run();
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
      });
      const stillOwing = (await owner.get('/v1/billing/subscription'))
        .body as Subscription;
      await app.internal().invoke(MarkInvoicePaidOperation, {
        tenantId: TENANT_A,
        invoiceId: String(next?.id),
        paidAt: new Date().toISOString(),
        reference: 'gateway-7782',
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
        await app.get(CloseInvoicePeriodsJob).run();
      });

      it('charges the starting plan for the period plus the rest of the period at the price difference of an upgrade', async () => {
        await changePlanMidPeriod('Pro');

        await app.get(CloseInvoicePeriodsJob).run();

        await expect(invoiceTotals()).resolves.toEqual([
          { total_minor: String(49_900 + 46_367) },
        ]);
      });

      it('charges the upgraded plan for the next period less the credit of a downgrade', async () => {
        await changePlanMidPeriod('Inicio');

        await app.get(CloseInvoicePeriodsJob).run();

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

        await app.get(CloseInvoicePeriodsJob).run();
        await app.get(CloseInvoicePeriodsJob).run();

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
  },
);
