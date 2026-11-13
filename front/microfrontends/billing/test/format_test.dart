import 'package:contracts/contracts.dart' show MoneyAmount;
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/l10n/billing_labels.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:utils/utils.dart' show formatMoney;

final _es = lookupBillingLocalizations(const Locale('es'));
final _en = lookupBillingLocalizations(const Locale('en'));

void main() {
  setUpAll(() async {
    await initializeDateFormatting('es');
    await initializeDateFormatting('en');
  });

  group('formatPeriod', () {
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

  group('quotaLabel', () {
    test('every quota key has a label in each language', () {
      for (final key in QuotaKey.values) {
        expect(quotaLabel(_es, key), isNotEmpty);
        expect(quotaLabel(_en, key), isNotEmpty);
      }
      expect(quotaLabel(_es, QuotaKey.users), 'Usuarios');
      expect(quotaLabel(_en, QuotaKey.users), 'Users');
    });
  });

  group('usageLevelFor', () {
    test('normal below 80%', () {
      expect(usageLevelFor(0, 100), UsageLevel.normal);
      expect(usageLevelFor(79, 100), UsageLevel.normal);
    });

    test('warning from 80% up to the limit', () {
      expect(usageLevelFor(80, 100), UsageLevel.warning);
      expect(usageLevelFor(99, 100), UsageLevel.warning);
    });

    test('danger from 100%', () {
      expect(usageLevelFor(100, 100), UsageLevel.danger);
      expect(usageLevelFor(150, 100), UsageLevel.danger);
    });

    test('a non-positive limit is danger', () {
      expect(usageLevelFor(0, 0), UsageLevel.danger);
    });
  });

  group('invoice totals', () {
    test('total is the contract MoneyAmount sum of the lines', () {
      final invoice = Invoice(
        id: 'x',
        number: 'FAC-1',
        period: BillingPeriod(
          start: DateTime(2026, 10, 1),
          end: DateTime(2026, 10, 31),
        ),
        status: InvoiceStatus.issued,
        currency: Currency.cop,
        lines: [
          InvoiceLine(
            kind: InvoiceLineKind.fixedFee,
            description: 'Plan',
            amount: MoneyAmount(
              amountMinor: 189000,
              currency: Currency.cop.code,
            ),
          ),
          InvoiceLine(
            kind: InvoiceLineKind.usage,
            description: 'Uso',
            amount: MoneyAmount(
              amountMinor: 12500,
              currency: Currency.cop.code,
            ),
          ),
        ],
      );
      expect(invoice.total.amountMinor, 201500);
      expect(invoice.total.currency, 'COP');
      expect(
        formatMoney(invoice.total, locale: 'es'),
        formatMoney(
          const MoneyAmount(amountMinor: 201500, currency: 'COP'),
          locale: 'es',
        ),
      );
    });
  });
}
