// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../billing/schemas/billing_schemas.dart';
import '../../billing/types/billing_types.dart';
import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';

/// Rutas HTTP públicas del contrato `billing`.
abstract final class BillingRoutes {
  /// Consulta la suscripción del tenant con su plan.
  ///
  /// `GET /v1/billing/subscription`
  static const getSubscription = RouteDescriptor<Empty, Subscription>(
    id: 'billing.subscription.get',
    method: HttpMethod.get,
    path: '/v1/billing/subscription',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'BILLING.SUBSCRIPTION.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['billing:read'],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: SubscriptionSchema.validateIncoming,
    decodeResponse: Subscription.fromJson,
  );

  /// Consulta el uso del periodo vigente de cada métrica con cuota.
  ///
  /// `GET /v1/billing/usage`
  static const getUsage = RouteDescriptor<Empty, UsageOverview>(
    id: 'billing.usage.get',
    method: HttpMethod.get,
    path: '/v1/billing/usage',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'BILLING.SUBSCRIPTION.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['billing:read'],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: UsageOverviewSchema.validateIncoming,
    decodeResponse: UsageOverview.fromJson,
  );

  /// Lista los planes del catálogo con su precio y sus límites.
  ///
  /// `GET /v1/billing/plans`
  static const listPlans = RouteDescriptor<Empty, PlanCatalog>(
    id: 'billing.plan.list',
    method: HttpMethod.get,
    path: '/v1/billing/plans',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>['billing:read'],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: PlanCatalogSchema.validateIncoming,
    decodeResponse: PlanCatalog.fromJson,
  );

  /// Cambia el plan de la suscripción del tenant.
  ///
  /// `PUT /v1/billing/subscription/plan`
  static const changePlan = RouteDescriptor<ChangePlanRequest, Subscription>(
    id: 'billing.subscription.change-plan',
    method: HttpMethod.put,
    path: '/v1/billing/subscription/plan',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
      'BILLING.SUBSCRIPTION.NOT_FOUND',
      'BILLING.SUBSCRIPTION.NOT_CHANGEABLE',
      'BILLING.PLAN.NOT_AVAILABLE',
      'BILLING.PLAN.USAGE_EXCEEDS_LIMIT',
    ],
    requiresAuth: true,
    permissions: <String>['billing:write'],
    platformRoles: <String>[],
    encodeRequest: ChangePlanRequest.encode,
    validateRequest: ChangePlanRequestSchema.validate,
    validateResponse: SubscriptionSchema.validateIncoming,
    decodeResponse: Subscription.fromJson,
  );

  /// Lista las facturas del tenant, con filtro y paginación.
  ///
  /// `GET /v1/billing/invoices`
  static const listInvoices = RouteDescriptor<ListInvoicesRequest, InvoicePage>(
    id: 'billing.invoice.list',
    method: HttpMethod.get,
    path: '/v1/billing/invoices',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
    ],
    requiresAuth: true,
    permissions: <String>['billing:read'],
    platformRoles: <String>[],
    encodeRequest: ListInvoicesRequest.encode,
    validateRequest: ListInvoicesRequestSchema.validate,
    validateResponse: InvoicePageSchema.validateIncoming,
    decodeResponse: InvoicePage.fromJson,
  );

  /// Consulta una factura con sus líneas.
  ///
  /// `GET /v1/billing/invoices/{invoiceId}`
  static const getInvoice = RouteDescriptor<GetInvoiceRequest, Invoice>(
    id: 'billing.invoice.get',
    method: HttpMethod.get,
    path: '/v1/billing/invoices/{invoiceId}',
    version: 1,
    pathParams: <String>['invoiceId'],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'BILLING.INVOICE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['billing:read'],
    platformRoles: <String>[],
    encodeRequest: GetInvoiceRequest.encode,
    validateRequest: GetInvoiceRequestSchema.validate,
    validateResponse: InvoiceSchema.validateIncoming,
    decodeResponse: Invoice.fromJson,
  );
}
