import 'package:contracts/contracts.dart' as api;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/api_billing_repository.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:test_utils/test_utils.dart';

const _planId = '0193f1c2-0000-7000-8000-0000000000a1';
const _invoiceId = '0193f1c2-0000-7000-8000-0000000000c1';

Map<String, Object?> _money(int minor) => {
  'amountMinor': minor,
  'currency': 'COP',
};

Map<String, Object?> _plan() => {
  'id': _planId,
  'name': 'Pro',
  'price': _money(9900000),
  'periodicity': 'monthly',
  'quotas': [
    {'metric': 'api_calls', 'limit': 100000},
  ],
  'features': <String>[],
};

Map<String, Object?> _subscription() => {
  'id': '0193f1c2-0000-7000-8000-0000000000b1',
  'plan': _plan(),
  'status': 'past_due',
  'period': {'start': '2026-11-01', 'end': '2026-11-30'},
};

Map<String, Object?> _invoice() => {
  'id': _invoiceId,
  'number': 'F-0005',
  'period': {'start': '2026-10-01', 'end': '2026-10-31'},
  'status': 'void',
  'currency': 'COP',
  'lines': [
    {'kind': 'fixed_fee', 'description': 'Plan Pro', 'amount': _money(9900000)},
    {'kind': 'usage', 'description': 'Llamadas', 'amount': _money(100)},
  ],
  'total': _money(9900100),
};

void main() {
  late ScriptedTransport transport;
  late ApiBillingRepository repository;

  setUp(() {
    transport = ScriptedTransport();
    repository = ApiBillingRepository(client: ScriptedApi.client(transport));
  });

  test('reads the subscription with its plan, quotas and period', () async {
    transport.json(200, _subscription());

    final subscription = await repository.currentSubscription();

    expect(subscription.status, SubscriptionStatus.pastDue);
    expect(subscription.plan.price.amountMinor, 9900000);
    expect(subscription.plan.quotas.single.key, UsageMetric.apiCalls);
    expect(subscription.period.end, DateTime(2026, 11, 30));
    expect(transport.requests.single.uri.path, '/v1/billing/subscription');
  });

  test('reads the usage of each quota against its limit', () async {
    transport.json(200, {
      'items': [
        {'metric': 'users', 'limit': 10, 'used': 9},
      ],
    });

    final usage = await repository.currentUsage();

    expect(usage.single.quota.key, UsageMetric.users);
    expect(usage.single.ratio, 0.9);
  });

  test('lists the plans and changes to one of them', () async {
    transport
      ..json(200, {
        'items': [_plan()],
      })
      ..json(200, _subscription());

    final plans = await repository.availablePlans();
    final changed = await repository.changePlan(plans.single.id);

    expect(changed.plan.name, 'Pro');
    expect(transport.requests.last.method, 'PUT');
    expect(transport.requests.last.uri.path, '/v1/billing/subscription/plan');
    expect(transport.bodyOf(1), {'planId': _planId});
  });

  test('a refused plan change reaches the caller with its code', () async {
    transport.problem(
      ProblemFixtures.withCode(
        api.BillingErrorCode.planUsageExceedsLimit.code,
        status: 409,
      ),
    );

    await expectLater(
      repository.changePlan(_planId),
      throwsA(
        isA<api.ApiErrorException>().having(
          (e) => e.problem.code,
          'code',
          api.BillingErrorCode.planUsageExceedsLimit.code,
        ),
      ),
    );
  });

  test('lists the latest invoices with their total', () async {
    transport.json(200, {
      'items': [
        {
          for (final MapEntry(:key, :value) in _invoice().entries)
            if (key != 'lines') key: value,
        },
      ],
      'nextCursor': null,
    });

    final invoices = await repository.invoices();

    expect(invoices.single.status, InvoiceStatus.voidValue);
    expect(invoices.single.total.amountMinor, 9900100);
    expect(transport.requests.single.uri.queryParameters, {'limit': '100'});
  });

  test('an invoice the API does not find is null', () async {
    transport
      ..json(200, _invoice())
      ..problem(
        ProblemFixtures.withCode(
          api.BillingErrorCode.invoiceNotFound.code,
          status: 404,
        ),
      );

    final found = await repository.invoice(_invoiceId);
    final missing = await repository.invoice(_invoiceId);

    expect(found?.number, 'F-0005');
    expect(found?.lines, hasLength(2));
    expect(found?.total.amountMinor, 9900100);
    expect(missing, isNull);
    expect(
      transport.requests.first.uri.path,
      '/v1/billing/invoices/$_invoiceId',
    );
  });

  test('any other problem with an invoice reaches the caller', () async {
    transport.problem(ProblemFixtures.unavailable());

    await expectLater(
      repository.invoice(_invoiceId),
      throwsA(isA<api.ApiErrorException>()),
    );
  });
}
