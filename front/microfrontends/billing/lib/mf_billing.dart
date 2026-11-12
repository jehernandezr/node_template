/// Microfrontend `billing`: manifest consumed by the web and mobile shells.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/billing_screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/billing`.
final MicrofrontendManifest billingManifest = MicrofrontendManifest(
  id: MicrofrontendId.billing,
  platforms: {AppPlatform.web},
  access: AccessRule.permissions([Permission.billingRead]),
  menu: const [MenuEntry(labelKey: 'menuBilling', path: '/billing', order: 50)],
  routes: _routes,
);

List<RouteBase> _routes(
  ScreenLoader load,
  MicrofrontendScope Function() scope,
) => [
  GoRoute(
    path: '/billing',
    builder: (context, state) => load(
      loadLibrary: screens.loadLibrary,
      builder: () => screens.buildBillingPlanPage(context, scope()),
      loading: const Center(child: CircularProgressIndicator()),
    ),
    routes: [
      GoRoute(
        path: 'invoices',
        builder: (context, state) => load(
          loadLibrary: screens.loadLibrary,
          builder: () => screens.buildInvoicesPage(context, scope()),
          loading: const Center(child: CircularProgressIndicator()),
        ),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => load(
              loadLibrary: screens.loadLibrary,
              builder: () => screens.buildInvoicePage(
                context,
                scope(),
                state.pathParameters['id'] ?? '',
              ),
              loading: const Center(child: CircularProgressIndicator()),
            ),
          ),
        ],
      ),
    ],
  ),
];
