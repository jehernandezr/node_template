import 'package:shell_core/shell_core.dart';

/// Access to the reports microfrontend and its screens.
abstract final class ReportsAccess {
  /// Rule to see the catalog, the runs and their results.
  static final AccessRule read = AccessRule.permissions([
    Permission.reportsRead,
  ]);

  /// Rule to generate a report. Guards the button that starts a run.
  static final AccessRule write = AccessRule.permissions([
    Permission.reportsWrite,
  ]);
}
