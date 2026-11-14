import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

final _shellPages = <RouteBase>[
  GoRoute(path: '/', builder: (_, _) => const Text('home')),
  GoRoute(path: '/login', builder: (_, _) => const Text('login')),
  GoRoute(path: '/forbidden', builder: (_, _) => const Text('forbidden')),
];

final _reader = UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

List<MicrofrontendManifest> _manifests() => [
  fakeManifest(id: MicrofrontendId.account, routePath: '/account'),
  fakeManifest(
    id: MicrofrontendId.tasks,
    access: AccessRule.permissions([Permission.tasksRead]),
    screens: [
      fakeScreen(
        '/tasks',
        'tasks',
        routes: [fakeScreen('detail/:id', 'detail')],
      ),
    ],
  ),
  fakeManifest(
    id: MicrofrontendId.backoffice,
    access: AccessRule.permissions([Permission.backofficeAccess]),
    routePath: '/backoffice',
  ),
  fakeManifest(
    id: MicrofrontendId.billing,
    platforms: {AppPlatform.web},
    routePath: '/billing',
  ),
  fakeManifest(
    id: MicrofrontendId.notifications,
    access: AccessRule.authenticated(),
    screens: [fakeScreen('/notifications', 'inbox')],
  ),
  fakeManifest(
    id: MicrofrontendId.assistant,
    flag: FeatureFlag.newReports,
    screens: [fakeScreen('/assistant', 'assistant')],
  ),
];

MicrofrontendRegistry _registry([List<MicrofrontendManifest>? manifests]) {
  final registry = MicrofrontendRegistry();
  for (final manifest in manifests ?? _manifests()) {
    registry.register(manifest);
  }
  return registry;
}

/// Builds the router the way a shell does: one runtime over [registry] and [session].
GoRouter _build({
  required MicrofrontendRegistry registry,
  required ValueNotifier<UserSession> session,
  AppPlatform platform = AppPlatform.web,
  ShellRouteBuilder? shellBuilder,
  RouteBase Function(List<RouteBase> microfrontendRoutes)? wrapRoutes,
  String loginPath = '/login',
  String forbiddenPath = '/forbidden',
}) => buildShellRouter(
  registry: registry,
  platform: platform,
  runtime: fakeRuntime(
    registry: registry,
    session: session,
    platform: platform,
  ),
  routes: _shellPages,
  shellBuilder: shellBuilder,
  wrapRoutes: wrapRoutes,
  loginPath: loginPath,
  forbiddenPath: forbiddenPath,
);

Future<GoRouter> _pump(
  WidgetTester tester, {
  required ValueNotifier<UserSession> session,
  AppPlatform platform = AppPlatform.web,
  required String location,
  MicrofrontendRegistry? registry,
  ShellRouteBuilder? shellBuilder,
  RouteBase Function(List<RouteBase> microfrontendRoutes)? wrapRoutes,
  String loginPath = '/login',
  String forbiddenPath = '/forbidden',
}) async {
  final router = _build(
    registry: registry ?? _registry(),
    session: session,
    platform: platform,
    shellBuilder: shellBuilder,
    wrapRoutes: wrapRoutes,
    loginPath: loginPath,
    forbiddenPath: forbiddenPath,
  );
  await tester.pumpWidget(
    WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
  );
  router.go(location);
  await tester.pumpAndSettle();
  return router;
}

Uri _uri(GoRouter router) => router.routerDelegate.currentConfiguration.uri;

void main() {
  testWidgets(
    'anonymous user is sent to login with the original location in from',
    (tester) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(UserSession.anonymous()),
        location: '/tasks/detail/1',
      );
      expect(_uri(router).path, '/login');
      expect(_uri(router).queryParameters['from'], '/tasks/detail/1');
    },
  );

  testWidgets('nested route is guarded by its first path segment', (
    tester,
  ) async {
    final router = await _pump(
      tester,
      session: ValueNotifier(_reader),
      location: '/tasks/detail/9',
    );
    expect(_uri(router).path, '/tasks/detail/9');
    expect(find.text('detail'), findsOneWidget);
  });

  testWidgets('a screen with an authenticated rule is guarded by path', (
    tester,
  ) async {
    final router = await _pump(
      tester,
      session: ValueNotifier(UserSession.anonymous()),
      location: '/notifications',
    );
    expect(_uri(router).path, '/login');
    expect(_uri(router).queryParameters['from'], '/notifications');
  });

  testWidgets('a screen behind a feature flag is guarded and needs the flag', (
    tester,
  ) async {
    final session = ValueNotifier(_reader);
    final denied = await _pump(
      tester,
      session: session,
      location: '/assistant',
    );
    expect(_uri(denied).path, '/forbidden');
    expect(_uri(denied).queryParameters['from'], '/assistant');

    session.value = UserSession(
      userId: 'u1',
      tenantId: 't1',
      permissions: {Permission.tasksRead},
      featureFlags: {FeatureFlag.newReports},
    );
    await tester.pumpAndSettle();
    final allowed = await _pump(
      tester,
      session: session,
      location: '/assistant',
    );
    expect(_uri(allowed).path, '/assistant');
  });

  testWidgets('public route stays open for anonymous users', (tester) async {
    final router = await _pump(
      tester,
      session: ValueNotifier(UserSession.anonymous()),
      location: '/account',
    );
    expect(_uri(router).path, '/account');
  });

  testWidgets('signed-in user without permission is sent to forbidden', (
    tester,
  ) async {
    final router = await _pump(
      tester,
      session: ValueNotifier(_reader),
      location: '/backoffice',
    );
    expect(_uri(router).path, '/forbidden');
    expect(_uri(router).queryParameters['from'], '/backoffice');
  });

  testWidgets('microfrontend missing for the platform is forbidden', (
    tester,
  ) async {
    final router = await _pump(
      tester,
      session: ValueNotifier(_reader),
      platform: AppPlatform.mobile,
      location: '/billing',
    );
    expect(_uri(router).path, '/forbidden');
  });

  testWidgets('login and forbidden pages never redirect (no loop)', (
    tester,
  ) async {
    final anonymousOnLogin = await _pump(
      tester,
      session: ValueNotifier(UserSession.anonymous()),
      location: '/login?from=%2Ftasks',
    );
    expect(_uri(anonymousOnLogin).path, '/login');
    expect(find.text('login'), findsOneWidget);

    final signedInOnForbidden = await _pump(
      tester,
      session: ValueNotifier(_reader),
      location: '/forbidden?from=%2Fbackoffice',
    );
    expect(_uri(signedInOnForbidden).path, '/forbidden');
  });

  testWidgets('equal sessions do not notify the router', (tester) async {
    final session = ValueNotifier(_reader);
    await _pump(tester, session: session, location: '/tasks');
    var notified = 0;
    session.addListener(() => notified++);

    session.value = UserSession(
      userId: 'u1',
      tenantId: 't1',
      permissions: {Permission.tasksRead},
    );
    expect(notified, 0);

    session.value = UserSession(userId: 'u1', tenantId: 't1');
    expect(notified, 1);
  });

  testWidgets(
    'shellBuilder wraps the manifest routes once and shell pages stay outside',
    (tester) async {
      var shellBuilds = 0;
      final router = await _pump(
        tester,
        session: ValueNotifier(_reader),
        location: '/tasks',
        shellBuilder: (context, state, child) {
          shellBuilds++;
          return Column(children: [const Text('chrome'), child]);
        },
      );

      final topLevel = router.configuration.routes;
      final shells = topLevel.whereType<ShellRoute>().toList();
      expect(
        shells,
        hasLength(1),
        reason: 'one wrapper for all manifest routes',
      );
      final tasksInside = shells.single.routes.whereType<GoRoute>().map(
        (r) => r.path,
      );
      expect(tasksInside, contains('/tasks'));
      expect(
        topLevel.whereType<GoRoute>().map((r) => r.path),
        containsAll(['/', '/login', '/forbidden']),
      );

      expect(find.text('chrome'), findsOneWidget);
      expect(find.text('tasks'), findsOneWidget);
      expect(shellBuilds, greaterThan(0));
    },
  );

  testWidgets(
    'wrapRoutes receives the manifest routes and its result is used as is',
    (tester) async {
      List<RouteBase>? received;
      final router = _build(
        registry: _registry(),
        session: ValueNotifier(_reader),
        wrapRoutes: (routes) {
          received = routes;
          return ShellRoute(
            builder: (context, state, child) =>
                Column(children: [const Text('wrapped'), child]),
            routes: routes,
          );
        },
      );
      expect(
        received!.whereType<GoRoute>().map((r) => r.path),
        contains('/tasks'),
      );
      expect(
        received!.whereType<GoRoute>().map((r) => r.path),
        isNot(contains('/login')),
      );
      expect(router.configuration.routes.whereType<ShellRoute>(), hasLength(1));

      await tester.pumpWidget(
        WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
      );
      router.go('/tasks');
      await tester.pumpAndSettle();
      expect(find.text('wrapped'), findsOneWidget);
      expect(find.text('tasks'), findsOneWidget);
    },
  );

  test('a manifest route outside its segment fails at startup', () {
    final registry = _registry([
      fakeManifest(id: MicrofrontendId.tasks, routePath: '/wrong'),
    ]);
    expect(
      () => _build(
        registry: registry,
        session: ValueNotifier(UserSession.anonymous()),
      ),
      throwsStateError,
    );
  });

  test('a shellBuilder router also fails on a route outside its segment', () {
    final registry = _registry([
      fakeManifest(id: MicrofrontendId.tasks, routePath: '/wrong'),
    ]);
    expect(
      () => _build(
        registry: registry,
        session: ValueNotifier(UserSession.anonymous()),
        shellBuilder: (context, state, child) => child,
      ),
      throwsStateError,
    );
  });

  test('a route whose path only shares a prefix with its segment fails', () {
    final registry = _registry([
      fakeManifest(id: MicrofrontendId.tasks, routePath: '/tasksheet'),
    ]);
    expect(
      () => _build(
        registry: registry,
        session: ValueNotifier(UserSession.anonymous()),
      ),
      throwsStateError,
    );
  });

  test('loginPath or forbiddenPath inside a microfrontend segment fails at startup', () {
    for (final paths in [
      (loginPath: '/tasks/login', forbiddenPath: '/forbidden'),
      (loginPath: '/login', forbiddenPath: '/billing/forbidden'),
    ]) {
      expect(
        () => _build(
          registry: _registry(),
          session: ValueNotifier(UserSession.anonymous()),
          loginPath: paths.loginPath,
          forbiddenPath: paths.forbiddenPath,
        ),
        throwsStateError,
      );
    }
  });
}
