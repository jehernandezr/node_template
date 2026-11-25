import 'package:contracts/contracts.dart' show ReportDownload;
import 'package:mf_reports/src/data/report_file_saver.dart';
import 'package:mf_reports/src/shared/enums/reports_enums.dart';

/// [ReportFileSaver] that keeps every file it gets and answers [outcome].
final class RecordingFileSaver implements ReportFileSaver {
  RecordingFileSaver({this.outcome = ReportSaveOutcome.downloaded});

  final ReportSaveOutcome outcome;
  final List<ReportDownload> saved = [];

  @override
  Future<ReportSaveOutcome> save(ReportDownload download) async {
    saved.add(download);
    return outcome;
  }
}
