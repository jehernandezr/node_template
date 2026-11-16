import 'package:intl/intl.dart';

/// Short date and time in [locale], for example `Nov 12, 2026 10:00`.
///
/// Locales other than English need date symbols loaded first, which the app
/// does through `flutter_localizations` (or `initializeDateFormatting`).
String formatDateTime(DateTime value, {required String locale}) =>
    DateFormat.yMMMd(locale).add_Hm().format(value.toLocal());

/// Short date in [locale], for example `Nov 12, 2026`.
String formatDate(DateTime value, {required String locale}) =>
    DateFormat.yMMMd(locale).format(value.toLocal());
