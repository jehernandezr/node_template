import 'package:contracts/contracts.dart'
    show ReportCatalogEntry, ReportFormat, ReportGranularity, ReportType;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/shared/enums/reports_enums.dart';
import 'package:mf_reports/src/shared/types/report_draft.dart';

const _entry = ReportCatalogEntry(
  type: ReportType.tasksActivity,
  formats: [ReportFormat.json, ReportFormat.csv],
  granularities: [ReportGranularity.week, ReportGranularity.month],
);

void main() {
  test('starts with the first format and grouping over 30 days', () {
    final draft = ReportDraft.of(_entry);

    expect(draft.format, ReportFormat.json);
    expect(draft.granularity, ReportGranularity.week);
    expect(draft.period, ReportPeriod.last30Days);
  });

  test('asks for the range that ends on the day given, both ends included', () {
    final request = ReportDraft.of(_entry)
        .copyWith(period: ReportPeriod.last7Days)
        .request(DateTime(2026, 3, 2, 23));

    expect(request.type, ReportType.tasksActivity);
    expect(request.params.from, '2026-02-24');
    expect(request.params.to, '2026-03-02');
  });
}
