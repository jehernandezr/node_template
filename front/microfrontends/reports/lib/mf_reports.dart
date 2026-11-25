/// Microfrontend `reports`: manifest consumed by the web and mobile shells.
///
/// This file imports nothing from `data/`, `screens/` or `l10n/` except
/// through the deferred import, so those load on demand.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/reports_access.dart';
import 'src/shared/constants/reports_paths.dart';

/// Manifest registered by the shells. Routes live under `/reports`: the
/// catalog, its runs and each run.
///
/// Data is not created here: the deferred screens get it from the scope of
/// the current identity. It serves demo and live shells: in live mode the
/// data comes from the reports API.
final MicrofrontendManifest reportsManifest = MicrofrontendManifest(
  id: reportsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: ReportsAccess.read,
  menu: const [
    MenuEntry(
      label: reportsMenuLabel,
      path: ReportsPaths.catalog,
      order: 45,
      icon: Icons.insert_chart_outlined,
      selectedIcon: Icons.insert_chart,
    ),
  ],
  screens: [
    ScreenRoute.deferred(
      ReportsPaths.catalog,
      library: screens.loadLibrary,
      build: (scope, params) => screens.ReportsScreens.catalog(scope),
      routes: [
        ScreenRoute.deferred(
          ReportsPaths.runsSegment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.ReportsScreens.runs(scope),
          routes: [
            ScreenRoute.deferred(
              ReportsPaths.runIdSegment,
              library: screens.loadLibrary,
              build: (scope, params) => screens.ReportsScreens.run(
                scope,
                runId: params.require(ReportsPaths.runIdParam),
              ),
            ),
          ],
        ),
      ],
    ),
  ],
);
