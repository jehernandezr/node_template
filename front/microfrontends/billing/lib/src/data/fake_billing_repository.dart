import 'package:contracts/contracts.dart';

import 'billing_models.dart';
import 'billing_repository.dart';

/// In-memory [BillingRepository] with sample data. Changes live as long as
/// the instance does.
///
/// Errors use [ApiErrorException], as the real client does. Pass [failure] to
/// make every call fail with it, for example to test error views.
final class FakeBillingRepository implements BillingRepository {
  FakeBillingRepository({this.failure});

  /// Error thrown by every call when set.
  final ApiErrorException? failure;

  void _failIfConfigured() {
    final error = failure;
    if (error != null) throw error;
  }

  static const _catalog = <Plan>[
    Plan(
      id: 'inicio',
      name: 'Inicio',
      price: Money(amountMinor: 49900, currency: Currency.cop),
      periodicity: PlanPeriodicity.monthly,
      quotas: [
        Quota(key: 'users', label: 'Usuarios', limit: 5),
        Quota(key: 'api_calls', label: 'Llamadas API', limit: 10000),
      ],
    ),
    Plan(
      id: 'pro',
      name: 'Pro',
      price: Money(amountMinor: 189000, currency: Currency.cop),
      periodicity: PlanPeriodicity.monthly,
      quotas: [
        Quota(key: 'users', label: 'Usuarios', limit: 25),
        Quota(key: 'api_calls', label: 'Llamadas API', limit: 100000),
        Quota(key: 'storage_gb', label: 'Almacenamiento (GB)', limit: 50),
      ],
    ),
    Plan(
      id: 'empresa',
      name: 'Empresa',
      price: Money(amountMinor: 110000, currency: Currency.usd),
      periodicity: PlanPeriodicity.annual,
      quotas: [
        Quota(key: 'users', label: 'Usuarios', limit: 200),
        Quota(key: 'api_calls', label: 'Llamadas API', limit: 1000000),
        Quota(key: 'storage_gb', label: 'Almacenamiento (GB)', limit: 500),
      ],
    ),
  ];

  late Subscription _subscription = Subscription(
    id: 'sub_001',
    plan: _catalog[1],
    status: SubscriptionStatus.active,
    period: BillingPeriod(
      start: DateTime(2026, 11, 1),
      end: DateTime(2026, 11, 30),
    ),
  );

  final Map<String, int> _usedByQuota = {
    'users': 20,
    'api_calls': 4200,
    'storage_gb': 50,
  };

  late final List<Invoice> _invoices = [
    _invoice(
      id: 'inv_005',
      number: 'FAC-2026-0011',
      month: 11,
      status: InvoiceStatus.draft,
      lines: const [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: Money(amountMinor: 189000, currency: Currency.cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Usuarios adicionales (3)',
          amount: Money(amountMinor: 36000, currency: Currency.cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_004',
      number: 'FAC-2026-0010',
      month: 10,
      status: InvoiceStatus.issued,
      lines: const [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: Money(amountMinor: 189000, currency: Currency.cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Llamadas API excedentes',
          amount: Money(amountMinor: 12500, currency: Currency.cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_003',
      number: 'FAC-2026-0009',
      month: 9,
      status: InvoiceStatus.paid,
      lines: const [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: Money(amountMinor: 189000, currency: Currency.cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_002',
      number: 'FAC-2026-0008',
      month: 8,
      status: InvoiceStatus.failed,
      lines: const [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: Money(amountMinor: 189000, currency: Currency.cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Almacenamiento adicional (GB)',
          amount: Money(amountMinor: 24000, currency: Currency.cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_001',
      number: 'FAC-2026-0007',
      month: 7,
      status: InvoiceStatus.voided,
      lines: const [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Inicio',
          amount: Money(amountMinor: 49900, currency: Currency.cop),
        ),
      ],
    ),
  ];

  static Invoice _invoice({
    required String id,
    required String number,
    required int month,
    required InvoiceStatus status,
    required List<InvoiceLine> lines,
  }) {
    return Invoice(
      id: id,
      number: number,
      period: BillingPeriod(
        start: DateTime(2026, month, 1),
        end: DateTime(2026, month + 1, 0),
      ),
      status: status,
      currency: Currency.cop,
      lines: lines,
    );
  }

  @override
  Future<Subscription> currentSubscription() async {
    _failIfConfigured();
    return _subscription;
  }

  @override
  Future<List<QuotaUsage>> currentUsage() async {
    _failIfConfigured();
    return [
      for (final quota in _subscription.plan.quotas)
        QuotaUsage(quota: quota, used: _usedByQuota[quota.key] ?? 0),
    ];
  }

  @override
  Future<List<Plan>> availablePlans() async {
    _failIfConfigured();
    return _catalog;
  }

  @override
  Future<Subscription> changePlan(String planId) async {
    _failIfConfigured();
    final plan = _catalog.where((p) => p.id == planId).firstOrNull;
    if (plan == null) {
      throw ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: 'Plan not found',
          status: 404,
          code: PlatformErrorCode.resourceNotFound.code,
        ),
      );
    }
    _subscription = Subscription(
      id: _subscription.id,
      plan: plan,
      status: _subscription.status,
      period: _subscription.period,
    );
    return _subscription;
  }

  @override
  Future<List<Invoice>> invoices() async {
    _failIfConfigured();
    return _invoices;
  }

  @override
  Future<Invoice?> invoice(String id) async {
    _failIfConfigured();
    return _invoices.where((invoice) => invoice.id == id).firstOrNull;
  }
}
