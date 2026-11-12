import 'package:intl/intl.dart';

import '../data/billing_models.dart';

/// Formats [money] for display.
///
/// COP uses es_CO separators with no decimals and the symbol first:
/// `$ 189.000`. USD uses en_US with two decimals: `US$1,100.00`.
String formatMoney(Money money) {
  final digits = money.currency.minorUnitDigits;
  final value = money.amountMinor / _pow10(digits);
  return _moneyFormat(money.currency).format(value);
}

NumberFormat _moneyFormat(Currency currency) => switch (currency) {
  // The es_CO pattern puts the symbol after the amount; the app shows it first.
  Currency.cop => NumberFormat.currency(
    locale: 'es_CO',
    symbol: currency.symbol,
    decimalDigits: currency.minorUnitDigits,
    customPattern: '¤ #,##0',
  ),
  Currency.usd => NumberFormat.currency(
    locale: 'en_US',
    symbol: currency.symbol,
    decimalDigits: currency.minorUnitDigits,
  ),
};

/// Groups an integer count with the es_CO separators, for example `12.345`.
String formatCount(int value) => NumberFormat.decimalPattern('es_CO').format(value);

int _pow10(int exponent) {
  var result = 1;
  for (var i = 0; i < exponent; i++) {
    result *= 10;
  }
  return result;
}
