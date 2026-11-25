import 'package:contracts/contracts.dart'
    show ReportFormat, ReportGranularity, ReportRunStatus, ReportType;

import '../shared/enums/reports_enums.dart';
import 'generated/reports_localizations.dart';

/// Texts of the values of the reports contract, in the language of [l10n].
final class ReportLabels {
  const ReportLabels(this.l10n);

  final ReportsLocalizations l10n;

  String type(ReportType type) => switch (type) {
    ReportType.tasksByStatus => l10n.typeTasksByStatus,
    ReportType.tasksActivity => l10n.typeTasksActivity,
    ReportType.invoicesSummary => l10n.typeInvoicesSummary,
    ReportType.notificationsDelivery => l10n.typeNotificationsDelivery,
  };

  String status(ReportRunStatus status) => switch (status) {
    ReportRunStatus.queued => l10n.statusQueued,
    ReportRunStatus.running => l10n.statusRunning,
    ReportRunStatus.ready => l10n.statusReady,
    ReportRunStatus.failed => l10n.statusFailed,
    ReportRunStatus.expired => l10n.statusExpired,
  };

  String format(ReportFormat format) => switch (format) {
    ReportFormat.json => l10n.formatJson,
    ReportFormat.csv => l10n.formatCsv,
  };

  String granularity(ReportGranularity granularity) => switch (granularity) {
    ReportGranularity.day => l10n.granularityDay,
    ReportGranularity.week => l10n.granularityWeek,
    ReportGranularity.month => l10n.granularityMonth,
  };

  String period(ReportPeriod period) => switch (period) {
    ReportPeriod.last7Days => l10n.periodLast7Days,
    ReportPeriod.last30Days => l10n.periodLast30Days,
    ReportPeriod.last90Days => l10n.periodLast90Days,
  };
}
