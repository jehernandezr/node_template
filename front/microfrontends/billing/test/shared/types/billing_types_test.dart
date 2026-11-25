import 'package:contracts/contracts.dart' show MoneyAmount;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:utils/utils.dart' show formatMoney;

void main() {
  group(usageLevelFor, () {
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
              currency: Currency.cop.wireCode,
            ),
          ),
          InvoiceLine(
            kind: InvoiceLineKind.usage,
            description: 'Uso',
            amount: MoneyAmount(
              amountMinor: 12500,
              currency: Currency.cop.wireCode,
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
