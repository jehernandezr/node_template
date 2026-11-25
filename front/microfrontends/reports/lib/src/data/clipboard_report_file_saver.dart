import 'package:contracts/contracts.dart' show ReportDownload;
import 'package:flutter/services.dart';

import '../shared/enums/reports_enums.dart';
import 'report_file_saver.dart';

/// [ReportFileSaver] outside the browser: the app has no folder of its own to
/// save into, so the content goes to the clipboard.
final class PlatformReportFileSaver implements ReportFileSaver {
  const PlatformReportFileSaver();

  @override
  Future<ReportSaveOutcome> save(ReportDownload download) async {
    await Clipboard.setData(ClipboardData(text: download.content));
    return ReportSaveOutcome.copied;
  }
}
