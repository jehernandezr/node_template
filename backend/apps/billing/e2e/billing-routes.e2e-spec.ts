import {
  billingContract,
  BillingErrorCode,
  BillingRoute,
  OpenAccountOperation,
  type InvoicePage,
  type PlanCatalog,
} from '@contracts/billing';
import { Permission } from '@contracts/identity';
import { PlatformErrorCode, type RouteDefinition } from '@contracts/platform';
import type { HttpTestClient } from '@platform/http/test-utils';
import { ContainerRuntime, JobContexts } from '@platform/kernel/test-utils';
import { BillingTestApp } from '../src/__tests__/utils/index.js';
import { CloseInvoicePeriodsJob } from '../src/modules/invoices/application/close-invoice-periods.job.js';

const OWNER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const OUTSIDER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b07';
/** One member per route: the service caches access by permission version and does not request it again. */
const exactAccessMember = (index: number) =>
  `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c${String(index).padStart(2, '0')}`;
const ROUTES: readonly RouteDefinition[] = Object.values(
  billingContract.routes,
);
const TENANT = BillingTestApp.TENANT_A;

new ContainerRuntime(process.env).describeIfAvailable(
  'billing routes end to end',
  () => {
    jest.setTimeout(300_000);
    const app = new BillingTestApp();
    let owner: HttpTestClient;
    let proPlanId: string;
    let invoiceId: string;

    beforeAll(async () => {
      await app.start();
      owner = await app.clientOf({ userId: OWNER, tenantId: TENANT });
      await app
        .internal()
        .invoke(OpenAccountOperation, { tenantId: TENANT, ownerUserId: OWNER });
      await app.rowsOf(
        TENANT,
        `UPDATE subscriptions SET status = 'active', period_start = '2026-01-01', period_end = '2026-01-31'`,
      );
      await app.get(CloseInvoicePeriodsJob).run(JobContexts.live());
      const plans = (await owner.get('/v1/billing/plans')).body as PlanCatalog;
      proPlanId = String(plans.items.find((plan) => plan.name === 'Pro')?.id);
      const invoices = (await owner.get('/v1/billing/invoices'))
        .body as InvoicePage;
      invoiceId = String(invoices.items[0]?.id);
    });

    afterAll(async () => {
      await app.stop();
    });

    const call = (client: HttpTestClient, route: RouteDefinition) =>
      client.send(route.method, route.path.replace('{invoiceId}', invoiceId), {
        body:
          route.id === BillingRoute.ChangePlan
            ? { planId: proPlanId }
            : undefined,
      });

    describe('access matrix', () => {
      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 401 without a token',
        async (_id, route) => {
          const response = await call(app.anonymous(), route);

          expect(response.status).toBe(401);
        },
      );

      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 403 to a member without its permission',
        async (_id, route) => {
          const member = await app.clientOf({
            userId: OUTSIDER,
            tenantId: TENANT,
            permissions: [],
          });

          const response = await call(member, route);

          expect(response.status).toBe(403);
          expect(response.body).toMatchObject({
            code: PlatformErrorCode.AuthForbidden,
          });
        },
      );

      it.each(ROUTES.map((route, index) => [route.id, route, index] as const))(
        '%s lets in a member with exactly its permissions',
        async (_id, route, index) => {
          const member = await app.clientOf({
            userId: exactAccessMember(index),
            tenantId: TENANT,
            permissions: Object.values(Permission).filter((permission) =>
              (route.access.permissions ?? []).includes(permission),
            ),
          });

          const response = await call(member, route);

          expect(response.status).toBeLessThan(300);
        },
      );
    });

    it('answers 404 to the subscription of a tenant without a billing account', async () => {
      const member = await app.clientOf({
        userId: OWNER,
        tenantId: BillingTestApp.TENANT_B,
      });

      const response = await member.get('/v1/billing/subscription');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        code: BillingErrorCode.SubscriptionNotFound,
      });
    });

    it('answers 404 to an invoice of another tenant', async () => {
      const member = await app.clientOf({
        userId: OWNER,
        tenantId: BillingTestApp.TENANT_B,
      });

      const response = await member.get(`/v1/billing/invoices/${invoiceId}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        code: BillingErrorCode.InvoiceNotFound,
      });
    });
  },
);
