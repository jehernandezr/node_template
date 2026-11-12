import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/billing_models.dart';
import 'package:mf_billing/src/format/money_format.dart';

void main() {
  group('formatMoney', () {
    test('COP has no decimals and groups thousands with dots', () {
      expect(
        formatMoney(const Money(amountMinor: 189000, currency: Currency.cop)),
        r'$ 189.000',
      );
      expect(
        formatMoney(const Money(amountMinor: 0, currency: Currency.cop)),
        r'$ 0',
      );
      expect(
        formatMoney(const Money(amountMinor: 1234567, currency: Currency.cop)),
        r'$ 1.234.567',
      );
    });

    test('USD has two decimals with en_US separators', () {
      expect(
        formatMoney(const Money(amountMinor: 110000, currency: Currency.usd)),
        r'US$1,100.00',
      );
      expect(
        formatMoney(const Money(amountMinor: 5, currency: Currency.usd)),
        r'US$0.05',
      );
      expect(
        formatMoney(const Money(amountMinor: 99950, currency: Currency.usd)),
        r'US$999.50',
      );
    });

    test('negative amounts keep the sign before the symbol', () {
      expect(
        formatMoney(const Money(amountMinor: -12500, currency: Currency.cop)),
        r'-$ 12.500',
      );
    });
  });

  group('formatCount', () {
    test('groups digits in threes', () {
      expect(formatCount(7), '7');
      expect(formatCount(1000), '1.000');
      expect(formatCount(100000), '100.000');
      expect(formatCount(1000000), '1.000.000');
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

  group('FakeBillingRepository invoice totals', () {
    test('total is the sum of the line amounts', () {
      final invoice = Invoice(
        id: 'x',
        number: 'FAC-1',
        period: BillingPeriod(
          start: DateTime(2026, 10, 1),
          end: DateTime(2026, 10, 31),
        ),
        status: InvoiceStatus.issued,
        currency: Currency.cop,
        lines: const [
          InvoiceLine(
            kind: InvoiceLineKind.fixedFee,
            description: 'Plan',
            amount: Money(amountMinor: 189000, currency: Currency.cop),
          ),
          InvoiceLine(
            kind: InvoiceLineKind.usage,
            description: 'Uso',
            amount: Money(amountMinor: 12500, currency: Currency.cop),
          ),
        ],
      );
      expect(invoice.total.amountMinor, 201500);
      expect(formatMoney(invoice.total), r'$ 201.500');
    });
  });
}
