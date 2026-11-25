// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'reports_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class ReportsLocalizationsEn extends ReportsLocalizations {
  ReportsLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get catalogTitle => 'Reports';

  @override
  String get runsTitle => 'Runs';

  @override
  String get runTitle => 'Report';

  @override
  String get loadError => 'The reports could not be loaded.';

  @override
  String get emptyCatalogTitle => 'No reports available';

  @override
  String get emptyCatalogMessage => 'Your plan includes no reports for now.';

  @override
  String get emptyRunsTitle => 'No runs yet';

  @override
  String get emptyRunsMessage =>
      'Generate a report from the catalog and it will show up here.';

  @override
  String get chooseReport => 'Choose a report to see its parameters.';

  @override
  String get periodLabel => 'Period';

  @override
  String get granularityLabel => 'Group by';

  @override
  String get formatLabel => 'Format';

  @override
  String get generate => 'Generate report';

  @override
  String get generateError => 'The report could not be generated.';

  @override
  String get download => 'Download';

  @override
  String downloaded(String fileName) {
    return '$fileName was downloaded.';
  }

  @override
  String copied(String fileName) {
    return '$fileName was copied to the clipboard.';
  }

  @override
  String get downloadError => 'The report could not be downloaded.';

  @override
  String get runPending =>
      'The report is being generated. This page updates by itself.';

  @override
  String get runFailed =>
      'The report could not be generated. Ask for a new one from the catalog.';

  @override
  String get runExpired =>
      'The result of this report expired. Ask for a new one from the catalog.';

  @override
  String get runNotFound => 'That report does not exist.';

  @override
  String get noRows => 'The report has no rows in that period.';

  @override
  String runRange(String from, String to) {
    return 'From $from to $to';
  }

  @override
  String requestedAt(String date) {
    return 'Requested on $date';
  }

  @override
  String get typeTasksByStatus => 'Tasks by status';

  @override
  String get typeTasksActivity => 'Task activity';

  @override
  String get typeInvoicesSummary => 'Invoice summary';

  @override
  String get typeNotificationsDelivery => 'Notification delivery';

  @override
  String get statusQueued => 'Queued';

  @override
  String get statusRunning => 'Generating';

  @override
  String get statusReady => 'Ready';

  @override
  String get statusFailed => 'Failed';

  @override
  String get statusExpired => 'Expired';

  @override
  String get formatJson => 'JSON';

  @override
  String get formatCsv => 'CSV';

  @override
  String get granularityDay => 'Day';

  @override
  String get granularityWeek => 'Week';

  @override
  String get granularityMonth => 'Month';

  @override
  String get periodLast7Days => '7 days';

  @override
  String get periodLast30Days => '30 days';

  @override
  String get periodLast90Days => '90 days';

  @override
  String runSummary(String range, String granularity, String format) {
    return '$range, grouped by $granularity, as $format';
  }
}
