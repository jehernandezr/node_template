import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mf_billing/src/l10n/billing_labels.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';

import '../utils/billing_test_app.dart';

final _es = BillingTestApp.es;
final _en = BillingTestApp.en;

void main() {
  setUpAll(() async {
    await initializeDateFormatting('es');
    await initializeDateFormatting('en');
  });

  group(formatPeriod, () {
    final period = BillingPeriod(
      start: DateTime(2026, 11, 1),
      end: DateTime(2026, 11, 30),
    );

    test('uses the dates of the locale and the localized range', () {
      expect(
        formatPeriod(_es, period, locale: 'es'),
        '1 nov 2026 a 30 nov 2026',
      );
      expect(
        formatPeriod(_en, period, locale: 'en'),
        _en.periodRange('Nov 1, 2026', 'Nov 30, 2026'),
      );
    });
  });

  group(quotaLabel, () {
    test('every quota key has a label in each language', () {
      for (final key in UsageMetric.values) {
        expect(quotaLabel(_es, key), isNotEmpty);
        expect(quotaLabel(_en, key), isNotEmpty);
      }
      expect(quotaLabel(_es, UsageMetric.users), 'Usuarios');
      expect(quotaLabel(_en, UsageMetric.users), 'Users');
    });
  });
}
