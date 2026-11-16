import 'package:contracts/contracts.dart';

import 'money_formatter.dart';

/// Formats [value] for people in [locale], for example `$1,234.56`.
///
/// The decimal digits come from the currency (ISO 4217): 2 for USD, 0 for JPY.
/// Builds a formatter per call; use [MoneyFormatter] when formatting many
/// values.
String formatMoney(MoneyAmount value, {required String locale}) =>
    MoneyFormatter(locale: locale).format(value);
