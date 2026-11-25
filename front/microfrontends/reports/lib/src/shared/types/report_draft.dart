import 'package:contracts/contracts.dart'
    show
        CreateReportRunRequest,
        ReportCatalogEntry,
        ReportFormat,
        ReportGranularity,
        ReportParams;

import '../enums/reports_enums.dart';

/// The parameters of a report the user is about to generate.
final class ReportDraft {
  const ReportDraft({
    required this.entry,
    required this.format,
    required this.granularity,
    required this.period,
  });

  /// A draft of [entry] with its first format and grouping over
  /// [defaultPeriod].
  factory ReportDraft.of(ReportCatalogEntry entry) => ReportDraft(
    entry: entry,
    format: entry.formats.first,
    granularity: entry.granularities.first,
    period: defaultPeriod,
  );

  /// Range a new draft covers.
  static const ReportPeriod defaultPeriod = ReportPeriod.last30Days;

  /// The report of the catalog, with the formats and groupings it allows.
  final ReportCatalogEntry entry;
  final ReportFormat format;
  final ReportGranularity granularity;
  final ReportPeriod period;

  ReportDraft copyWith({
    ReportFormat? format,
    ReportGranularity? granularity,
    ReportPeriod? period,
  }) => ReportDraft(
    entry: entry,
    format: format ?? this.format,
    granularity: granularity ?? this.granularity,
    period: period ?? this.period,
  );

  /// The request of this draft for a range that ends on the day of [today].
  CreateReportRunRequest request(DateTime today) {
    final to = DateTime.utc(today.year, today.month, today.day);
    final from = to.subtract(Duration(days: period.days - 1));
    return CreateReportRunRequest(
      type: entry.type,
      format: format,
      params: ReportParams(
        from: _date(from),
        to: _date(to),
        granularity: granularity,
      ),
    );
  }

  static String _date(DateTime day) => day.toIso8601String().substring(0, 10);
}
