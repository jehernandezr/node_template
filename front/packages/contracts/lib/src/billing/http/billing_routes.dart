// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../billing/schemas/billing_schemas.dart';
import '../../billing/types/billing_types.dart';
import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';

/// Public HTTP routes of the `billing` contract.
abstract final class BillingRoutes {
  /// Gets the tenant subscription with its plan.
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

  /// Gets the current period usage of each metric with a quota.
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

  /// Lists the catalog plans with their price and limits.
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

  /// Changes the plan of the tenant subscription.
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

  /// Lists the tenant invoices, with filter and pagination.
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

  /// Gets an invoice with its lines.
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
