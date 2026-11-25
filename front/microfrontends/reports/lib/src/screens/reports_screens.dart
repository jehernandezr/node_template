/// Entry points of the reports screens, used by the manifest.
///
/// This file is imported as `deferred`, so the repository, the sample data
/// and the texts travel with the screens.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/platform_report_file_saver.dart';
import '../data/reports_data.dart';
import '../data/reports_repository.dart';
import '../l10n/generated/reports_localizations.dart';
import 'report_catalog_screen.dart';
import 'report_run_screen.dart';
import 'report_runs_screen.dart';

/// Builds each reports screen for a [MicrofrontendScope]. The repository is
/// the scope's, so every identity has its own and releases it on close.
abstract final class ReportsScreens {
  /// Route `/reports`.
  static Widget catalog(MicrofrontendScope scope) =>
      _withTexts(ReportCatalogScreen(repository: _repository(scope)));

  /// Route `/reports/runs`.
  static Widget runs(MicrofrontendScope scope) =>
      _withTexts(ReportRunsScreen(repository: _repository(scope)));

  /// Route `/reports/runs/:runId`.
  static Widget run(MicrofrontendScope scope, {required String runId}) =>
      _withTexts(
        ReportRunScreen(
          repository: _repository(scope),
          saver: const PlatformReportFileSaver(),
          runId: runId,
        ),
      );

  static ReportsRepository _repository(MicrofrontendScope scope) =>
      scope.repository(ReportsData.repository);

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withTexts(Widget child) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: child,
  );
}
