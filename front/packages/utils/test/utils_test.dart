import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:utils/utils.dart';

void main() {
  group('money', () {
    test('creates amounts that satisfy the contract', () {
      final value = moneyOf(1500, 'COP');
      expect(value, const MoneyAmount(amountMinor: 1500, currency: 'COP'));
      expect(MoneyAmountSchema.validate(value.toJson()), isEmpty);
    });

    test('rejects currencies that break the contract', () {
      expect(() => moneyOf(1, 'cop'), throwsArgumentError);
    });

    test('adds, subtracts and multiplies in minor units', () {
      final a = moneyOf(1050, 'USD');
      final b = moneyOf(250, 'USD');
      expect(addMoney(a, b).amountMinor, 1300);
      expect(subtractMoney(b, a).amountMinor, -800);
      expect(multiplyMoney(a, 3).amountMinor, 3150);
      expect(() => addMoney(a, moneyOf(1, 'COP')), throwsArgumentError);
    });

    test('allocates without losing minor units', () {
      expect(allocateMoney(moneyOf(100, 'USD'), 3).map((m) => m.amountMinor), [
        34,
        33,
        33,
      ]);
      expect(allocateMoney(moneyOf(-5, 'USD'), 2).map((m) => m.amountMinor), [
        -3,
        -2,
      ]);
      expect(() => allocateMoney(moneyOf(1, 'USD'), 0), throwsArgumentError);
    });

    test('formats with the currency digits', () {
      expect(currencyDigits('USD'), 2);
      expect(currencyDigits('JPY'), 0);
      expect(
        formatMoney(moneyOf(123456, 'USD'), locale: 'en_US'),
        r'$1,234.56',
      );
      expect(formatMoney(moneyOf(500, 'JPY'), locale: 'en_US'), '¥500');
    });
  });

  group('numbers', () {
    test('groups integers with the locale separators', () {
      expect(formatInteger(1234567, locale: 'en'), '1,234,567');
      expect(formatInteger(1234567, locale: 'es'), '1.234.567');
      expect(formatInteger(7, locale: 'es'), '7');
    });
  });

  group('ids', () {
    const id = '0193f1c2-0000-7000-8000-000000000000';

    test('recognizes UUIDv7 with the contract pattern', () {
      expect(isUuidV7(id), isTrue);
      expect(isUuidV7('0193f1c2-0000-4000-8000-000000000000'), isFalse);
    });

    test('reads the creation time of a UUIDv7', () {
      expect(
        uuidV7Time(id),
        DateTime.fromMillisecondsSinceEpoch(0x0193f1c20000, isUtc: true),
      );
      expect(uuidV7Time('nope'), isNull);
    });

    test('shortens ids for people', () {
      expect(shortId(id), '0193f1c2…0000');
      expect(shortId('abc'), 'abc');
    });
  });

  group('dates', () {
    setUpAll(() => initializeDateFormatting('en'));

    test('formats dates and counts days', () {
      final date = DateTime(2026, 11, 12, 10, 5);
      expect(formatDate(date, locale: 'en'), 'Nov 12, 2026');
      expect(formatDateTime(date, locale: 'en'), 'Nov 12, 2026 10:05');
      expect(
        daysBetween(DateTime(2026, 11, 12, 23), DateTime(2026, 11, 14, 1)),
        2,
      );
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
