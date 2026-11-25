import '../enums/reports_enums.dart';

/// A report file the user can now take: its name and where it went.
final class SavedReport {
  const SavedReport({required this.fileName, required this.outcome});

  final String fileName;
  final ReportSaveOutcome outcome;
}
