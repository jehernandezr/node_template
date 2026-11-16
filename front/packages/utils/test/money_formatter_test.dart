import 'package:contracts/contracts.dart';
import 'package:test/test.dart';
import 'package:utils/utils.dart';

void main() {
  group(MoneyFormatter, () {
    test('formats with two decimals by default', () {
      final formatter = MoneyFormatter(locale: 'en_US');

      expect(
        formatter.format(
          const MoneyAmount(amountMinor: 123456, currency: 'USD'),
        ),
        r'$1,234.56',
      );
    });

    test('a zero-decimal currency has no fraction', () {
      final formatter = MoneyFormatter(locale: 'en_US');

      expect(
        formatter.format(const MoneyAmount(amountMinor: 500, currency: 'JPY')),
        '¥500',
      );
    });

    test('a three-decimal currency keeps three digits', () {
      final formatter = MoneyFormatter(locale: 'en_US');

      expect(
        formatter.format(
          const MoneyAmount(amountMinor: 1234567, currency: 'KWD'),
        ),
        contains('1,234.567'),
      );
    });

    test('a four-decimal currency keeps four digits', () {
      final formatter = MoneyFormatter(locale: 'en_US');

      expect(
        formatter.format(
          const MoneyAmount(amountMinor: 123456789, currency: 'CLF'),
        ),
        contains('12,345.6789'),
      );
    });

    test('formats with the separators of its locale', () {
      final formatter = MoneyFormatter(locale: 'es');

      expect(
        formatter.format(
          const MoneyAmount(amountMinor: 123456, currency: 'EUR'),
        ),
        startsWith('1.234,56'),
      );
    });

    test('formatting another currency does not change the first one', () {
      final formatter = MoneyFormatter(locale: 'en_US');
      const usd = MoneyAmount(amountMinor: 123456, currency: 'USD');
      const jpy = MoneyAmount(amountMinor: 500, currency: 'JPY');

      final first = formatter.format(usd);
      expect(formatter.format(usd), first);

      formatter.format(jpy);
      expect(formatter.format(usd), first);
    });

    test('formatMoney delegates to MoneyFormatter', () {
      final formatter = MoneyFormatter(locale: 'en_US');
      const amounts = [
        MoneyAmount(amountMinor: 123456, currency: 'USD'),
        MoneyAmount(amountMinor: 500, currency: 'JPY'),
        MoneyAmount(amountMinor: 1234567, currency: 'KWD'),
      ];

      for (final amount in amounts) {
        expect(formatMoney(amount, locale: 'en_US'), formatter.format(amount));
      }
    });
  });
}
