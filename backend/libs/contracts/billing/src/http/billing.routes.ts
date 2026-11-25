import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { Permission, SessionGuardErrors } from '@contracts/identity';
import { BillingErrorCode, BillingRoute } from '../enums/identifiers.enum.js';
import {
  ChangePlanRequestSchema,
  GetInvoiceRequestSchema,
  InvoicePageSchema,
  InvoiceSchema,
  ListInvoicesRequestSchema,
  PlanCatalogSchema,
  SubscriptionSchema,
  UsageOverviewSchema,
} from '../schemas/billing.schema.js';

/** `GET /v1/billing/subscription`: current subscription of the tenant. */
export const GetSubscriptionRoute = defineRoute({
  id: BillingRoute.GetSubscription,
  method: HttpMethod.Get,
  path: '/v1/billing/subscription',
  response: SubscriptionSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.SubscriptionNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Gets the tenant subscription with its plan.',
});

/** `GET /v1/billing/usage`: usage of the current period against the plan limits. */
export const GetUsageRoute = defineRoute({
  id: BillingRoute.GetUsage,
  method: HttpMethod.Get,
  path: '/v1/billing/usage',
  response: UsageOverviewSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.SubscriptionNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Gets the current period usage of each metric with a quota.',
});

/** `GET /v1/billing/plans`: catalog of available plans. */
export const ListPlansRoute = defineRoute({
  id: BillingRoute.ListPlans,
  method: HttpMethod.Get,
  path: '/v1/billing/plans',
  response: PlanCatalogSchema,
  errors: [...SessionGuardErrors],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Lists the catalog plans with their price and limits.',
});

/** `PUT /v1/billing/subscription/plan`: changes the subscription plan. */
export const ChangePlanRoute = defineRoute({
  id: BillingRoute.ChangePlan,
  method: HttpMethod.Put,
  path: '/v1/billing/subscription/plan',
  request: ChangePlanRequestSchema,
  response: SubscriptionSchema,
  errors: [
    ...SessionGuardErrors,
    PlatformErrorCode.ValidationInvalidInput,
    BillingErrorCode.SubscriptionNotFound,
    BillingErrorCode.SubscriptionNotChangeable,
    BillingErrorCode.PlanNotAvailable,
    BillingErrorCode.PlanUsageExceedsLimit,
  ],
  access: Access.authenticated({ permissions: [Permission.BillingWrite] }),
  description: 'Changes the plan of the tenant subscription.',
});

/** `GET /v1/billing/invoices`: invoices of the tenant, newest first. */
export const ListInvoicesRoute = defineRoute({
  id: BillingRoute.ListInvoices,
  method: HttpMethod.Get,
  path: '/v1/billing/invoices',
  request: ListInvoicesRequestSchema,
  response: InvoicePageSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Lists the tenant invoices, with filter and pagination.',
});

/** `GET /v1/billing/invoices/{invoiceId}`: detail of an invoice with its lines. */
export const GetInvoiceRoute = defineRoute({
  id: BillingRoute.GetInvoice,
  method: HttpMethod.Get,
  path: '/v1/billing/invoices/{invoiceId}',
  request: GetInvoiceRequestSchema,
  response: InvoiceSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.InvoiceNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Gets an invoice with its lines.',
});
