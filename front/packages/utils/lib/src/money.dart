import 'package:contracts/contracts.dart';
import 'package:intl/intl.dart';

/// Creates a [MoneyAmount] and checks it against the contract.
///
/// Throws [ArgumentError] when the amount or the currency break the contract.
MoneyAmount moneyOf(int amountMinor, String currency) {
  final value = MoneyAmount(amountMinor: amountMinor, currency: currency);
  final errors = value.validate();
  if (errors.isNotEmpty) {
    throw ArgumentError.value(
      '$amountMinor $currency',
      'money',
      errors.map((e) => '${e.field} ${e.code}').join(', '),
    );
  }
  return value;
}

void _sameCurrency(MoneyAmount a, MoneyAmount b) {
  if (a.currency != b.currency) {
    throw ArgumentError('Cannot combine ${a.currency} and ${b.currency}');
  }
}

/// Adds two amounts of the same currency.
MoneyAmount addMoney(MoneyAmount a, MoneyAmount b) {
  _sameCurrency(a, b);
  return moneyOf(a.amountMinor + b.amountMinor, a.currency);
}

/// Subtracts [b] from [a], both in the same currency.
MoneyAmount subtractMoney(MoneyAmount a, MoneyAmount b) {
  _sameCurrency(a, b);
  return moneyOf(a.amountMinor - b.amountMinor, a.currency);
}

/// Multiplies an amount by an integer [quantity].
MoneyAmount multiplyMoney(MoneyAmount value, int quantity) =>
    moneyOf(value.amountMinor * quantity, value.currency);

/// Splits [value] in [parts] integer amounts that add up to the total.
/// Leftover minor units go to the first parts.
List<MoneyAmount> allocateMoney(MoneyAmount value, int parts) {
  if (parts < 1) throw ArgumentError.value(parts, 'parts', 'must be >= 1');
  final sign = value.amountMinor < 0 ? -1 : 1;
  final total = value.amountMinor.abs();
  final base = total ~/ parts;
  final remainder = total - base * parts;
  return [
    for (var i = 0; i < parts; i++)
      moneyOf(sign * (base + (i < remainder ? 1 : 0)), value.currency),
  ];
}

/// Decimal digits of [currency] by ISO 4217, for example 2 for USD and 0 for JPY.
int currencyDigits(String currency) =>
    NumberFormat.currency(locale: 'en', name: currency).decimalDigits ?? 2;

/// Formats [value] for people in [locale], for example `$1,234.56`.
String formatMoney(MoneyAmount value, {required String locale}) {
  final digits = currencyDigits(value.currency);
  final format = NumberFormat.simpleCurrency(
    locale: locale,
    name: value.currency,
    decimalDigits: digits,
  );
  return format.format(value.amountMinor / _pow10(digits));
}

int _pow10(int exponent) {
  var result = 1;
  for (var i = 0; i < exponent; i++) {
    result *= 10;
  }
  return result;
}
