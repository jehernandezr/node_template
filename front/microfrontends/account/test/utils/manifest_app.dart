import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/mf_account.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import 'test_app.dart';

/// Pumps the real manifest routes in a plain [GoRouter], over a
/// [ShellAccessScope] with [session]. `/step-up` and `/forbidden` are
/// placeholder pages.
Future<GoRouter> pumpAccountRoutes(
  WidgetTester tester, {
  required String location,
  UserSession? session,
  MicrofrontendScope? scope,
}) async {
  final ownScope = scope ?? testScope();
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...accountManifest.buildRoutes(
        DeferredLibraryLoader().page,
        () => ownScope,
      ),
      GoRoute(path: '/step-up', builder: (_, _) => const Text('step-up page')),
      GoRoute(path: '/forbidden', builder: (_, _) => const Text('forbidden')),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ShellAccessScope(
      session: ValueNotifier(session ?? testSession()),
      clock: FakeClock().now,
      paths: const ShellPaths(stepUp: '/step-up'),
      child: MaterialApp.router(
        routerConfig: router,
        locale: const Locale('es'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          ...GlobalMaterialLocalizations.delegates,
          GlobalWidgetsLocalizations.delegate,
          AppLocalizations.delegate,
        ],
      ),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

/// Current path of [router].
String currentPath(GoRouter router) =>
    router.routerDelegate.currentConfiguration.uri.path;
