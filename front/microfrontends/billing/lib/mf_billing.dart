/// Microfrontend `billing`: manifest consumed by the web shell.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/billing_screens.dart' deferred as screens;
import 'src/shared/constants/billing_access.dart';
import 'src/shared/constants/billing_paths.dart';

/// Manifest registered by the shells. Routes live under `/billing`.
///
/// Everything in `src/data`, `src/screens` and `src/l10n` loads through the
/// deferred `screens` import on the first visit. Demo only: billing has no
/// contract yet.
final MicrofrontendManifest billingManifest = MicrofrontendManifest(
  id: billingId,
  platforms: {AppPlatform.web},
  access: billingAccessRule,
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: billingMenuLabel,
      path: BillingPaths.plan,
      order: 50,
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
    ),
  ],
  screens: [
    ScreenRoute(
      path: BillingPaths.plan,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildBillingPlanPage(scope),
      routes: [
        ScreenRoute(
          path: BillingPaths.invoicesSegment,
          access: billingAccessRule,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildInvoicesPage(scope),
          routes: [
            ScreenRoute(
              path: ':${BillingPaths.idParam}',
              access: billingAccessRule,
              loadLibrary: screens.loadLibrary,
              builder: (scope, {params = const {}}) => screens.buildInvoicePage(
                scope,
                params[BillingPaths.idParam] ?? '',
              ),
            ),
          ],
        ),
      ],
    ),
  ],
);
