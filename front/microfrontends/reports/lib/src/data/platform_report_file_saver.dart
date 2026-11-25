/// The [ReportFileSaver] of the platform the app runs on.
library;

export 'clipboard_report_file_saver.dart'
    if (dart.library.js_interop) 'browser_report_file_saver.dart';
export 'report_file_saver.dart';
