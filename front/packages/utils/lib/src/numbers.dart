import 'package:intl/intl.dart';

/// Formats a whole number with the grouping of [locale], for example
/// `12,345` in `en` and `12.345` in `es`.
String formatInteger(int value, {required String locale}) =>
    NumberFormat.decimalPattern(locale).format(value);
