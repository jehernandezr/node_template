import 'package:contracts/contracts.dart' show ReportDownload;

import '../shared/enums/reports_enums.dart';

/// Puts the file of a report where the user can take it.
abstract interface class ReportFileSaver {
  /// Saves [download] and says where it went.
  Future<ReportSaveOutcome> save(ReportDownload download);
}
