import 'package:contracts/contracts.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:test/test.dart';
import 'package:utils/utils.dart';

void main() {
  group('money', () {
    test('formats with the currency digits', () {
      expect(
        formatMoney(
          const MoneyAmount(amountMinor: 123456, currency: 'USD'),
          locale: 'en_US',
        ),
        r'$1,234.56',
      );
      expect(
        formatMoney(
          const MoneyAmount(amountMinor: 500, currency: 'JPY'),
          locale: 'en_US',
        ),
        '¥500',
      );
    });
  });

  group('numbers', () {
    test('groups integers with the locale separators', () {
      expect(formatInteger(1234567, locale: 'en'), '1,234,567');
      expect(formatInteger(1234567, locale: 'es'), '1.234.567');
      expect(formatInteger(7, locale: 'es'), '7');
    });
  });

  group('dates', () {
    setUpAll(() => initializeDateFormatting('en'));

    test('formats dates', () {
      final date = DateTime(2026, 11, 12, 10, 5);
      expect(formatDate(date, locale: 'en'), 'Nov 12, 2026');
      expect(formatDateTime(date, locale: 'en'), 'Nov 12, 2026 10:05');
    });
  });

  test('groups field errors by field', () {
    expect(
      fieldErrorsByField(const [
        FieldError(field: 'email', code: 'A'),
        FieldError(field: 'email', code: 'B'),
        FieldError(code: 'C'),
      ]),
      {
        'email': ['A', 'B'],
        '': ['C'],
      },
    );
  });
}
