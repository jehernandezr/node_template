import 'dart:js_interop';

import 'package:contracts/contracts.dart' show ReportDownload;
import 'package:web/web.dart' as web;

import '../shared/enums/reports_enums.dart';
import 'report_file_saver.dart';

/// [ReportFileSaver] in the browser: the file downloads with its own name.
final class PlatformReportFileSaver implements ReportFileSaver {
  /// Saver that downloads the file in the browser.
  const PlatformReportFileSaver();

  @override
  Future<ReportSaveOutcome> save(ReportDownload download) async {
    final blob = web.Blob(
      [download.content.toJS].toJS,
      web.BlobPropertyBag(type: download.contentType),
    );
    final url = web.URL.createObjectURL(blob);
    try {
      (web.HTMLAnchorElement()
            ..href = url
            ..download = download.fileName)
          .click();
    } finally {
      web.URL.revokeObjectURL(url);
    }
    return ReportSaveOutcome.downloaded;
  }
}
