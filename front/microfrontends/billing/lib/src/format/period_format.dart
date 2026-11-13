import '../shared/types/billing_types.dart';
import '../l10n/generated/billing_localizations.dart';

/// Formats a period as `1 nov 2026 a 30 nov 2026`, using the localized
/// range text and month names of [l10n].
String formatPeriod(BillingLocalizations l10n, BillingPeriod period) {
  String date(DateTime d) => '${d.day} ${_monthShort(l10n, d.month)} ${d.year}';
  return l10n.periodRange(date(period.start), date(period.end));
}

String _monthShort(BillingLocalizations l10n, int month) => switch (month) {
  1 => l10n.monthJan,
  2 => l10n.monthFeb,
  3 => l10n.monthMar,
  4 => l10n.monthApr,
  5 => l10n.monthMay,
  6 => l10n.monthJun,
  7 => l10n.monthJul,
  8 => l10n.monthAug,
  9 => l10n.monthSep,
  10 => l10n.monthOct,
  11 => l10n.monthNov,
  _ => l10n.monthDec,
};
