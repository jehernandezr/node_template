/// Microfrontend `billing`: manifest consumed by the web and mobile shells.
library;

import 'package:shell_core/shell_core.dart';

import 'src/shared/constants/billing_access.dart';
import 'src/screens/billing_screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/billing`.
///
/// Everything in `src/data`, `src/screens` and `src/l10n` loads through the
/// deferred `screens` import on the first visit.
final MicrofrontendManifest billingManifest = MicrofrontendManifest(
  id: MicrofrontendId.billing,
  platforms: {AppPlatform.web},
  access: billingAccessRule,
  menu: const [MenuEntry(labelKey: 'menuBilling', path: '/billing', order: 50)],
  screens: [
    ScreenRoute(
      path: '/billing',
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildBillingPlanPage(scope),
      routes: [
        ScreenRoute(
          path: 'invoices',
          access: billingAccessRule,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildInvoicesPage(scope),
          routes: [
            ScreenRoute(
              path: ':id',
              access: billingAccessRule,
              loadLibrary: screens.loadLibrary,
              builder: (scope, {params = const {}}) =>
                  screens.buildInvoicePage(scope, params['id'] ?? ''),
            ),
          ],
        ),
      ],
    ),
  ],
);
