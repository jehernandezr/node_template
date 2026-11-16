import {
  AccessKind,
  HttpMethod,
  PlatformErrorCode,
  QueryParamsCodec,
  validateContract,
} from '@contracts/platform';
import { Permission, SessionGuardErrors } from '@contracts/identity';
import { billingContract } from '../contract.js';
import { BillingErrorCode, BillingRoute } from '../enums/identifiers.enum.js';
import { InvoiceStatus, UsageMetric } from '../enums/billing.enum.js';
import { Ids, Invoice, Subscription, UuidV4 } from './utils/fixtures.js';

const cases = [
  {
    id: BillingRoute.GetSubscription,
    route: billingContract.routes.getSubscription,
    method: HttpMethod.Get,
    path: '/v1/billing/subscription',
    successStatus: 200,
    permission: Permission.BillingRead,
  },
  {
    id: BillingRoute.GetUsage,
    route: billingContract.routes.getUsage,
    method: HttpMethod.Get,
    path: '/v1/billing/usage',
    successStatus: 200,
    permission: Permission.BillingRead,
  },
  {
    id: BillingRoute.ListPlans,
    route: billingContract.routes.listPlans,
    method: HttpMethod.Get,
    path: '/v1/billing/plans',
    successStatus: 200,
    permission: Permission.BillingRead,
  },
  {
    id: BillingRoute.ChangePlan,
    route: billingContract.routes.changePlan,
    method: HttpMethod.Put,
    path: '/v1/billing/subscription/plan',
    successStatus: 200,
    permission: Permission.BillingWrite,
  },
  {
    id: BillingRoute.ListInvoices,
    route: billingContract.routes.listInvoices,
    method: HttpMethod.Get,
    path: '/v1/billing/invoices',
    successStatus: 200,
    permission: Permission.BillingRead,
  },
  {
    id: BillingRoute.GetInvoice,
    route: billingContract.routes.getInvoice,
    method: HttpMethod.Get,
    path: '/v1/billing/invoices/{invoiceId}',
    successStatus: 200,
    permission: Permission.BillingRead,
  },
] as const;

describe('billing routes', () => {
  it.each(cases.map((item) => [item.id, item] as const))(
    'declares %s with its method, path and status',
    (_id, item) => {
      expect(item.route.id).toBe(item.id);
      expect(item.route.method).toBe(item.method);
      expect(item.route.path).toBe(item.path);
      expect(item.route.successStatus).toBe(item.successStatus);
    },
  );

  it.each(cases.map((item) => [item.id, item] as const))(
    'guards %s with its permission and the session errors',
    (_id, item) => {
      expect(item.route.access).toMatchObject({
        kind: AccessKind.Authenticated,
        permissions: [item.permission],
      });
      for (const code of SessionGuardErrors) {
        expect(item.route.errors).toContain(code);
      }
    },
  );

  it('uses every BillingRoute value exactly once', () => {
    const used = Object.values(billingContract.routes).map((r) => r.id);
    expect([...used].sort()).toEqual(Object.values(BillingRoute).sort());
  });

  it('declares the plan change errors', () => {
    expect(billingContract.routes.changePlan.errors).toEqual(
      expect.arrayContaining([
        PlatformErrorCode.ValidationInvalidInput,
        BillingErrorCode.SubscriptionNotFound,
        BillingErrorCode.SubscriptionNotChangeable,
        BillingErrorCode.PlanNotAvailable,
        BillingErrorCode.PlanUsageExceedsLimit,
      ]),
    );
  });

  it('declares the invoice not found error on the invoice detail', () => {
    expect(billingContract.routes.getInvoice.errors).toContain(
      BillingErrorCode.InvoiceNotFound,
    );
    expect(billingContract.routes.getInvoice.pathParams).toEqual(['invoiceId']);
  });

  describe('change plan request', () => {
    const { request } = billingContract.routes.changePlan;

    it('accepts a plan identifier', () => {
      expect(validateContract(request, { planId: Ids.item }).ok).toBe(true);
    });

    it('rejects a plan identifier that is not v7', () => {
      expect(validateContract(request, { planId: UuidV4 }).ok).toBe(false);
    });

    it('rejects an unknown field', () => {
      expect(
        validateContract(request, { planId: Ids.item, discount: 10 }).ok,
      ).toBe(false);
    });
  });

  describe('list invoices query', () => {
    const route = billingContract.routes.listInvoices;

    it('declares the filters and the pagination as query params', () => {
      expect(route.queryParams.map((p) => p.name)).toEqual([
        'status',
        'limit',
        'after',
      ]);
    });

    it('decodes and validates a filtered query', () => {
      const decoded = new QueryParamsCodec().decode(route, {
        status: InvoiceStatus.Paid,
        limit: '20',
      });
      expect(validateContract(route.request, decoded).ok).toBe(true);
    });

    it('rejects an unknown invoice status', () => {
      const decoded = new QueryParamsCodec().decode(route, { status: 'nope' });
      expect(validateContract(route.request, decoded).ok).toBe(false);
    });
  });

  describe('responses', () => {
    it('accepts a complete subscription', () => {
      expect(
        validateContract(billingContract.schemas.Subscription, Subscription).ok,
      ).toBe(true);
    });

    it('rejects a period with a malformed date', () => {
      expect(
        validateContract(billingContract.schemas.Subscription, {
          ...Subscription,
          period: { start: '01/11/2026', end: '2026-11-30' },
        }).ok,
      ).toBe(false);
    });

    it('accepts a complete invoice with a fixed fee line', () => {
      expect(
        validateContract(billingContract.schemas.Invoice, Invoice).ok,
      ).toBe(true);
    });

    it('accepts a usage overview with the metric of the quota', () => {
      expect(
        validateContract(billingContract.schemas.UsageOverview, {
          items: [{ metric: UsageMetric.Users, limit: 10, used: 4 }],
        }).ok,
      ).toBe(true);
    });
  });
});
