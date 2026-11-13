import 'package:contracts/contracts.dart';

import '../shared/enums/billing_enums.dart';
import '../shared/types/billing_types.dart';
import 'billing_repository.dart';

/// In-memory [BillingRepository] with sample data. Changes live as long as
/// the instance does.
///
/// Errors use [ApiErrorException], as the real client does. Pass [failure] to
/// make every call fail with it, for example to test error views.
base class FakeBillingRepository implements BillingRepository {
  FakeBillingRepository({this.failure});

  /// Error thrown by every call when set.
  final ApiErrorException? failure;

  void _failIfConfigured() {
    final error = failure;
    if (error != null) throw error;
  }

  static final _cop = Currency.cop.code;
  static final _usd = Currency.usd.code;

  static final _catalog = <Plan>[
    Plan(
      id: 'inicio',
      name: 'Inicio',
      price: MoneyAmount(amountMinor: 49900, currency: _cop),
      periodicity: PlanPeriodicity.monthly,
      quotas: [
        Quota(key: QuotaKey.users, limit: 5),
        Quota(key: QuotaKey.apiCalls, limit: 10000),
      ],
    ),
    Plan(
      id: 'pro',
      name: 'Pro',
      price: MoneyAmount(amountMinor: 189000, currency: _cop),
      periodicity: PlanPeriodicity.monthly,
      quotas: [
        Quota(key: QuotaKey.users, limit: 25),
        Quota(key: QuotaKey.apiCalls, limit: 100000),
        Quota(key: QuotaKey.storageGb, limit: 50),
      ],
    ),
    Plan(
      id: 'empresa',
      name: 'Empresa',
      price: MoneyAmount(amountMinor: 110000, currency: _usd),
      periodicity: PlanPeriodicity.annual,
      quotas: [
        Quota(key: QuotaKey.users, limit: 200),
        Quota(key: QuotaKey.apiCalls, limit: 1000000),
        Quota(key: QuotaKey.storageGb, limit: 500),
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

  final Map<QuotaKey, int> _usedByQuota = {
    QuotaKey.users: 20,
    QuotaKey.apiCalls: 4200,
    QuotaKey.storageGb: 50,
  };

  late final List<Invoice> _invoices = [
    _invoice(
      id: 'inv_005',
      number: 'FAC-2026-0011',
      month: 11,
      status: InvoiceStatus.draft,
      lines: [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: MoneyAmount(amountMinor: 189000, currency: _cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Usuarios adicionales (3)',
          amount: MoneyAmount(amountMinor: 36000, currency: _cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_004',
      number: 'FAC-2026-0010',
      month: 10,
      status: InvoiceStatus.issued,
      lines: [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: MoneyAmount(amountMinor: 189000, currency: _cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Llamadas API excedentes',
          amount: MoneyAmount(amountMinor: 12500, currency: _cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_003',
      number: 'FAC-2026-0009',
      month: 9,
      status: InvoiceStatus.paid,
      lines: [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: MoneyAmount(amountMinor: 189000, currency: _cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_002',
      number: 'FAC-2026-0008',
      month: 8,
      status: InvoiceStatus.failed,
      lines: [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Pro',
          amount: MoneyAmount(amountMinor: 189000, currency: _cop),
        ),
        InvoiceLine(
          kind: InvoiceLineKind.usage,
          description: 'Almacenamiento adicional (GB)',
          amount: MoneyAmount(amountMinor: 24000, currency: _cop),
        ),
      ],
    ),
    _invoice(
      id: 'inv_001',
      number: 'FAC-2026-0007',
      month: 7,
      status: InvoiceStatus.voided,
      lines: [
        InvoiceLine(
          kind: InvoiceLineKind.fixedFee,
          description: 'Plan Inicio',
          amount: MoneyAmount(amountMinor: 49900, currency: _cop),
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
  void dispose() {}

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
