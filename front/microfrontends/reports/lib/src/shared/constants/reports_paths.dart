import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId reportsId = MicrofrontendId('reports');

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel reportsMenuLabel = MenuLabel({
  'es': 'Reportes',
  'en': 'Reports',
});

/// Routes of the reports microfrontend. The manifest and the screens build
/// every location from here.
abstract final class ReportsPaths {
  /// The catalog, root of the microfrontend.
  static const String catalog = '/reports';

  /// Segment of the runs, child of [catalog].
  static const String runsSegment = 'runs';

  /// The runs of the tenant.
  static const String runs = '$catalog/$runsSegment';

  /// Name of the run id path parameter.
  static const String runIdParam = 'runId';

  /// Segment of one run, child of [runs].
  static const String runIdSegment = ':$runIdParam';

  /// One run with its result.
  static String run(String id) => '$runs/$id';
}
