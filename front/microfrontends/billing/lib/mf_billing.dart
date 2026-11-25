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
/// deferred `screens` import on the first visit. It serves demo and live
/// shells: in live mode the data comes from the billing API.
final MicrofrontendManifest billingManifest = MicrofrontendManifest(
  id: billingId,
  platforms: {AppPlatform.web},
  access: billingAccessRule,
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
    ScreenRoute.deferred(
      BillingPaths.plan,
      library: screens.loadLibrary,
      build: (scope, params) => screens.BillingScreens.plan(scope),
      routes: [
        ScreenRoute.deferred(
          BillingPaths.invoicesSegment,
          access: billingAccessRule,
          library: screens.loadLibrary,
          build: (scope, params) => screens.BillingScreens.invoices(scope),
          routes: [
            ScreenRoute.deferred(
              ':${BillingPaths.idParam}',
              access: billingAccessRule,
              library: screens.loadLibrary,
              build: (scope, params) => screens.BillingScreens.invoice(
                scope,
                params.require(BillingPaths.idParam),
              ),
            ),
          ],
        ),
      ],
    ),
  ],
);
