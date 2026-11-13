import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/mf_backoffice.dart';
import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart' show AppPage;

/// Fixed time of every test. MFA ages are measured from here.
final DateTime testNow = DateTime.utc(2026, 11, 13, 10);

DateTime testClock() => testNow;

/// Shell pages the access redirects send to.
const String loginPath = '/login';
const String forbiddenPath = '/forbidden';
const String stepUpPath = '/step-up';

final List<RouteBase> shellPages = [
  GoRoute(path: loginPath, builder: (_, _) => const Text('login')),
  GoRoute(path: forbiddenPath, builder: (_, _) => const Text('forbidden')),
  GoRoute(path: stepUpPath, builder: (_, _) => const Text('step-up')),
];

/// Signed-in platform user with [roles]. The second factor was verified
/// [mfaAge] ago, or never when [mfaAge] is null.
UserSession platformUser(
  Set<PlatformRole> roles, {
  Duration? mfaAge = Duration.zero,
}) => UserSession(
  userId: 'operator-${roles.map((r) => r.name).join('-')}',
  platformRoles: roles,
  mfaVerifiedAt: mfaAge == null ? null : testNow.subtract(mfaAge),
);

/// Signed-in tenant user (tenant permissions, no platform role) with a fresh
/// second factor.
UserSession tenantUser() => UserSession(
  userId: 'tenant-admin',
  tenantId: 'tenant-1',
  permissions: {
    Permission.tasksRead,
    Permission.tasksWrite,
    Permission.billingRead,
  },
  mfaVerifiedAt: testNow,
);

/// New scope for [session], as the runtime creates one per identity.
MicrofrontendScope newScope([UserSession? session]) => MicrofrontendScope(
  DefaultShellServices(
    session: session ?? platformUser({PlatformRole.superAdmin}),
    eventBus: ShellEventBus(),
  ),
);

void _largeView(WidgetTester tester) {
  tester.view.physicalSize = const Size(1280, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

/// The app around the router. It registers only the shell's localizations:
/// the backoffice strings must come from the deferred library.
Widget _app(GoRouter router, Locale locale) => MaterialApp.router(
  routerConfig: router,
  locale: locale,
  supportedLocales: const [Locale('es'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
);

/// Mounts the manifest routes with `backofficeManifest.buildRoutes` in a plain
/// [GoRouter], under a [ShellAccessScope] for [session], at [location].
///
/// The manifest's own access rule is the shell's job and is not applied here;
/// the sub-route rules (`ScreenRoute.access`) and the in-screen checks are.
/// When [repository] is set, the scope returns it instead of the fake.
Future<({GoRouter router, MicrofrontendScope scope})> pumpBackoffice(
  WidgetTester tester, {
  required String location,
  UserSession? session,
  BackofficeRepository? repository,
  MicrofrontendScope? scope,
  Locale locale = const Locale('es'),
  bool settle = true,
}) async {
  _largeView(tester);
  final current = session ?? platformUser({PlatformRole.superAdmin});
  final identity = scope ?? newScope(current);
  if (repository != null) {
    identity.get<BackofficeRepository>((_) => repository);
  }
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...shellPages,
      ...backofficeManifest.buildRoutes(deferredPage, () => identity),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ShellAccessScope(
      session: ValueNotifier(current),
      clock: testClock,
      paths: const ShellPaths(stepUp: stepUpPath),
      child: _app(router, locale),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    // Wait for the deferred library without settling, so a screen that stays
    // loading can be inspected. The load must finish here: the VM keeps the
    // future of a deferred load, and a load left pending in this test's fake
    // zone would never complete for the next tests.
    for (var i = 0; i < 20 && find.byType(AppPage).evaluate().isEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(Duration.zero));
      await tester.pump(const Duration(milliseconds: 16));
    }
  }
  return (router: router, scope: identity);
}

/// Mounts the backoffice through `buildShellRouter`, as the web shell does:
/// the manifest's access rule decides sign-in, step-up or forbidden.
Future<GoRouter> pumpThroughShell(
  WidgetTester tester, {
  required UserSession session,
  required String location,
}) async {
  _largeView(tester);
  final registry = MicrofrontendRegistry()..register(backofficeManifest);
  final ValueListenable<UserSession> source = ValueNotifier(session);
  late final ShellRuntime runtime;
  runtime = ShellRuntime(
    registry: registry,
    platform: AppPlatform.web,
    session: source,
    clock: testClock,
    servicesFactory: (identity) =>
        DefaultShellServices(session: identity, eventBus: runtime.eventBus),
  );
  final router = buildShellRouter(
    registry: registry,
    platform: AppPlatform.web,
    runtime: runtime,
    routes: shellPages,
    loginPath: loginPath,
    forbiddenPath: forbiddenPath,
    stepUpPath: stepUpPath,
    clock: testClock,
  );
  addTearDown(() {
    router.dispose();
    // Not awaited: closing the event bus waits for listeners that a widget
    // test never attaches, so awaiting it would hang the test.
    unawaited(runtime.dispose());
  });
  await tester.pumpWidget(_app(router, const Locale('es')));
  router.go(location);
  await tester.pumpAndSettle();
  return router;
}

/// Current location of [router].
Uri locationOf(GoRouter router) =>
    router.routerDelegate.currentConfiguration.uri;
