import 'dart:math' as math;

import 'package:contracts/contracts.dart';
import 'package:intl/intl.dart';

/// Formats [MoneyAmount] values for people in one locale.
final class MoneyFormatter {
  /// A formatter for [locale], for example `en_US`.
  MoneyFormatter({required this.locale});

  /// Locale of the formatted text.
  final String locale;

  /// ISO 4217 minor units of the currencies that do not use two.
  static const Map<String, int> _minorUnits = {
    'BIF': 0,
    'CLP': 0,
    'DJF': 0,
    'GNF': 0,
    'ISK': 0,
    'JPY': 0,
    'KMF': 0,
    'KRW': 0,
    'PYG': 0,
    'RWF': 0,
    'UGX': 0,
    'UYI': 0,
    'VND': 0,
    'VUV': 0,
    'XAF': 0,
    'XOF': 0,
    'XPF': 0,
    'BHD': 3,
    'IQD': 3,
    'JOD': 3,
    'KWD': 3,
    'LYD': 3,
    'OMR': 3,
    'TND': 3,
    'CLF': 4,
    'UYW': 4,
  };

  final Map<String, NumberFormat> _formats = {};

  /// Caches the `NumberFormat` per currency; the decimals come from a small
  /// ISO 4217 table, so no second format is built per call.
  String format(MoneyAmount value) {
    final digits = _digitsOf(value.currency);
    final format = _formats.putIfAbsent(
      value.currency,
      () => NumberFormat.simpleCurrency(
        locale: locale,
        name: value.currency,
        decimalDigits: digits,
      ),
    );
    return format.format(value.amountMinor / math.pow(10, digits).toInt());
  }

  int _digitsOf(String currency) => _minorUnits[currency] ?? 2;
}
