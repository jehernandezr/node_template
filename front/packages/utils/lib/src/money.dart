import 'package:contracts/contracts.dart';
import 'package:intl/intl.dart';

/// Formats [value] for people in [locale], for example `$1,234.56`.
///
/// The decimal digits come from the currency (ISO 4217): 2 for USD, 0 for JPY.
String formatMoney(MoneyAmount value, {required String locale}) {
  final digits =
      NumberFormat.currency(locale: 'en', name: value.currency).decimalDigits ??
      2;
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
