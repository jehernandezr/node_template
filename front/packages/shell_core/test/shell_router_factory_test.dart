import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/fakes.dart';

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
  fakeManifest(id: TestIds.account, routePath: '/account'),
  fakeManifest(
    id: TestIds.tasks,
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
    id: TestIds.backoffice,
    access: AccessRule.permissions([Permission.backofficeAccess]),
    routePath: '/backoffice',
  ),
  fakeManifest(
    id: TestIds.billing,
    platforms: {AppPlatform.web},
    routePath: '/billing',
  ),
  fakeManifest(
    id: TestIds.notifications,
    access: AccessRule.authenticated(),
    screens: [fakeScreen('/notifications', 'inbox')],
  ),
  fakeManifest(
    id: TestIds.assistant,
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

/// Factory over [registry] and [session], the way a shell builds it.
ShellRouterFactory _factory({
  required MicrofrontendRegistry registry,
  required ValueNotifier<UserSession> session,
  DeferredLibraryLoader? loader,
  ShellPaths paths = const ShellPaths(),
}) => ShellRouterFactory(
  registry: registry,
  platform: AppPlatform.web,
  runtime: fakeRuntime(registry: registry, session: session),
  loader: loader ?? DeferredLibraryLoader(),
  paths: paths,
);

Future<GoRouter> _pump(
  WidgetTester tester, {
  required ValueNotifier<UserSession> session,
  required String location,
  MicrofrontendRegistry? registry,
  DeferredLibraryLoader? loader,
}) async {
  final router = _factory(
    registry: registry ?? _registry(),
    session: session,
    loader: loader,
  ).build(routes: _shellPages, shellBuilder: passThroughShell);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
  );
  router.go(location);
  await tester.pumpAndSettle();
  return router;
}

Uri _uri(GoRouter router) => router.routerDelegate.currentConfiguration.uri;

void main() {
  group(ShellRouterFactory, () {
    testWidgets(
      'anonymous user is sent to login with the original location in from',
      (tester) async {
        final router = await _pump(
          tester,
          session: ValueNotifier(UserSession.anonymous()),
          location: '/tasks',
        );

        expect(_uri(router).path, '/login');
        expect(_uri(router).queryParameters['from'], '/tasks');
      },
    );

    testWidgets('signed-in user without permission is sent to forbidden', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(UserSession(userId: 'u')),
        location: '/tasks',
      );

      expect(_uri(router).path, '/forbidden');
    });

    testWidgets('public route stays open for anonymous users', (tester) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(UserSession.anonymous()),
        location: '/account',
      );

      expect(_uri(router).path, '/account');
      expect(find.text('/account'), findsOneWidget);
    });

    testWidgets('a signed-in reader sees the screen and its nested route', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_reader),
        location: '/tasks',
      );
      expect(find.text('tasks'), findsOneWidget);

      router.go('/tasks/detail/1');
      await tester.pumpAndSettle();

      expect(find.text('detail'), findsOneWidget);
    });

    test('a manifest route outside its segment fails at build', () {
      final registry = _registry([
        fakeManifest(id: TestIds.tasks, routePath: '/wrong'),
      ]);
      final factory = _factory(
        registry: registry,
        session: ValueNotifier(UserSession.anonymous()),
      );

      expect(
        () =>
            factory.build(routes: _shellPages, shellBuilder: passThroughShell),
        throwsStateError,
      );
    });

    test('a shell page inside a microfrontend segment fails at build', () {
      for (final paths in const [
        ShellPaths(login: '/tasks'),
        ShellPaths(forbidden: '/billing/forbidden'),
        ShellPaths(stepUp: '/account/step-up'),
      ]) {
        final factory = _factory(
          registry: _registry(),
          session: ValueNotifier(UserSession.anonymous()),
          paths: paths,
        );

        expect(
          () => factory.build(
            routes: _shellPages,
            shellBuilder: passThroughShell,
          ),
          throwsStateError,
        );
      }
    });

    testWidgets(
      'a longer segment is not guarded by the rule of a shorter one',
      (tester) async {
        final router = await _pump(
          tester,
          session: ValueNotifier(UserSession.anonymous()),
          location: '/tasks2',
          registry: _registry([
            fakeManifest(
              id: TestIds.tasks,
              access: AccessRule.permissions([Permission.tasksRead]),
              routePath: '/tasks',
            ),
            fakeManifest(
              id: const MicrofrontendId('tasks2'),
              routePath: '/tasks2',
            ),
          ]),
        );

        expect(_uri(router).path, '/tasks2');
        expect(find.text('/tasks2'), findsOneWidget);
      },
    );

    testWidgets(
      'the redirect checks a recent second factor with the injected clock',
      (tester) async {
        final verifiedAt = DateTime.utc(2026, 1, 1, 10);
        var now = verifiedAt.add(const Duration(minutes: 5));
        final registry = _registry([
          fakeManifest(
            id: TestIds.backoffice,
            access: AccessRule.mfa(const Duration(minutes: 10)),
            routePath: '/backoffice',
          ),
        ]);
        final session = ValueNotifier(
          UserSession(userId: 'u1').withMfaVerifiedAt(verifiedAt),
        );
        final router =
            ShellRouterFactory(
              registry: registry,
              platform: AppPlatform.web,
              runtime: fakeRuntime(registry: registry, session: session),
              loader: DeferredLibraryLoader(),
              paths: const ShellPaths(stepUp: '/step-up'),
              clock: () => now,
            ).build(
              routes: [
                ..._shellPages,
                GoRoute(
                  path: '/step-up',
                  builder: (_, _) => const Text('step-up'),
                ),
              ],
              shellBuilder: passThroughShell,
            );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          WidgetsApp.router(
            color: const Color(0xFF000000),
            routerConfig: router,
          ),
        );

        router.go('/backoffice');
        await tester.pumpAndSettle();
        expect(_uri(router).path, '/backoffice');

        now = verifiedAt.add(const Duration(minutes: 11));
        router.go('/');
        await tester.pumpAndSettle();
        router.go('/backoffice');
        await tester.pumpAndSettle();

        expect(_uri(router).path, '/step-up');
        expect(_uri(router).queryParameters['from'], '/backoffice');
      },
    );

    testWidgets('pages wait on the loader loading view', (tester) async {
      final completer = Completer<void>();
      final registry = _registry([
        fakeManifest(
          id: const MicrofrontendId('slow'),
          screens: [
            ScreenRoute(
              path: '/slow',
              loadLibrary: () => completer.future,
              builder: (scope, {params = const {}}) =>
                  const Text('slow screen'),
            ),
          ],
        ),
      ]);
      final router = _factory(
        registry: registry,
        session: ValueNotifier(UserSession.anonymous()),
        loader: DeferredLibraryLoader(loading: const Text('shell loading')),
      ).build(routes: _shellPages, shellBuilder: passThroughShell);
      addTearDown(router.dispose);

      await tester.pumpWidget(
        WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
      );
      router.go('/slow');
      await tester.pump();

      expect(find.text('shell loading'), findsOneWidget);
      expect(find.text('slow screen'), findsNothing);

      completer.complete();
      await tester.pumpAndSettle();

      expect(find.text('slow screen'), findsOneWidget);
    });

    testWidgets(
      'two factories with their own loaders do not share the library cache',
      (tester) async {
        var loads = 0;
        Future<void> loadLibrary() async {
          loads++;
        }

        MicrofrontendRegistry slowRegistry() => _registry([
          fakeManifest(
            id: const MicrofrontendId('slow'),
            screens: [
              ScreenRoute(
                path: '/slow',
                loadLibrary: loadLibrary,
                builder: (scope, {params = const {}}) =>
                    const Text('slow screen'),
              ),
            ],
          ),
        ]);

        await _pump(
          tester,
          session: ValueNotifier(UserSession.anonymous()),
          location: '/slow',
          registry: slowRegistry(),
          loader: DeferredLibraryLoader(),
        );
        expect(loads, 1);

        await tester.pumpWidget(const SizedBox());
        await _pump(
          tester,
          session: ValueNotifier(UserSession.anonymous()),
          location: '/slow',
          registry: slowRegistry(),
          loader: DeferredLibraryLoader(),
        );
        expect(loads, 2);
      },
    );
  });
}
