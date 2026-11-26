import '../enums/reports_enums.dart';

/// A report file the user can now take: its name and where it went.
final class SavedReport {
  /// File [fileName] saved with [outcome].
  const SavedReport({required this.fileName, required this.outcome});

  /// Name of the file.
  final String fileName;

  /// How it was saved.
  final ReportSaveOutcome outcome;
}
