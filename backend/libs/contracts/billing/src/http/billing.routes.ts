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

/** `GET /v1/billing/subscription`: suscripción vigente del tenant. */
export const GetSubscriptionRoute = defineRoute({
  id: BillingRoute.GetSubscription,
  method: HttpMethod.Get,
  path: '/v1/billing/subscription',
  response: SubscriptionSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.SubscriptionNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Consulta la suscripción del tenant con su plan.',
});

/** `GET /v1/billing/usage`: uso del periodo vigente frente a los límites del plan. */
export const GetUsageRoute = defineRoute({
  id: BillingRoute.GetUsage,
  method: HttpMethod.Get,
  path: '/v1/billing/usage',
  response: UsageOverviewSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.SubscriptionNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Consulta el uso del periodo vigente de cada métrica con cuota.',
});

/** `GET /v1/billing/plans`: catálogo de planes disponibles. */
export const ListPlansRoute = defineRoute({
  id: BillingRoute.ListPlans,
  method: HttpMethod.Get,
  path: '/v1/billing/plans',
  response: PlanCatalogSchema,
  errors: [...SessionGuardErrors],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Lista los planes del catálogo con su precio y sus límites.',
});

/** `PUT /v1/billing/subscription/plan`: cambia el plan de la suscripción. */
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
  description: 'Cambia el plan de la suscripción del tenant.',
});

/** `GET /v1/billing/invoices`: facturas del tenant, más nuevas primero. */
export const ListInvoicesRoute = defineRoute({
  id: BillingRoute.ListInvoices,
  method: HttpMethod.Get,
  path: '/v1/billing/invoices',
  request: ListInvoicesRequestSchema,
  response: InvoicePageSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Lista las facturas del tenant, con filtro y paginación.',
});

/** `GET /v1/billing/invoices/{invoiceId}`: detalle de una factura con sus líneas. */
export const GetInvoiceRoute = defineRoute({
  id: BillingRoute.GetInvoice,
  method: HttpMethod.Get,
  path: '/v1/billing/invoices/{invoiceId}',
  request: GetInvoiceRequestSchema,
  response: InvoiceSchema,
  errors: [...SessionGuardErrors, BillingErrorCode.InvoiceNotFound],
  access: Access.authenticated({ permissions: [Permission.BillingRead] }),
  description: 'Consulta una factura con sus líneas.',
});
