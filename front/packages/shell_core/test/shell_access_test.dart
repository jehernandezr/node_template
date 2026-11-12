import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

final _now = DateTime.utc(2026, 11, 12, 10);
DateTime _clock() => _now;

final _admin = UserSession(
  userId: 'admin',
  platformRoles: {PlatformRole.superAdmin},
);

final _reader = UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

final _writer = UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.tasksRead, Permission.tasksWrite},
);

final _backofficeRule = AccessRule.all([
  AccessRule.platformRoles([PlatformRole.superAdmin]),
  AccessRule.mfa(const Duration(minutes: 15)),
]);

MicrofrontendRegistry _registry() => MicrofrontendRegistry()
  ..register(
    fakeManifest(
      id: MicrofrontendId.backoffice,
      access: _backofficeRule,
      routePath: '/backoffice',
    ),
  )
  ..register(
    fakeManifest(
      id: MicrofrontendId.tasks,
      access: AccessRule.permissions([Permission.tasksRead]),
      screens: [
        ScreenRoute(
          path: '/tasks',
          loadLibrary: () async {},
          builder: (scope, {params = const {}}) => const Text('tasks'),
          routes: [
            ScreenRoute(
              path: 'new',
              access: AccessRule.permissions([Permission.tasksWrite]),
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) => const Text('new task'),
            ),
          ],
        ),
      ],
    ),
  )
  ..register(
    fakeManifest(
      id: MicrofrontendId.billing,
      access: AccessRule.authenticated(),
      routes: (load, scope) => [
        GoRoute(
          path: '/billing',
          builder: (_, _) => const Text('billing'),
          routes: [
            GoRoute(
              path: 'admin',
              redirect: accessRedirect(
                AccessRule.permissions([Permission.billingRead]),
              ),
              builder: (_, _) => const Text('billing admin'),
            ),
          ],
        ),
      ],
    ),
  );

final _shellPages = <RouteBase>[
  GoRoute(path: '/login', builder: (_, _) => const Text('login')),
  GoRoute(path: '/forbidden', builder: (_, _) => const Text('forbidden')),
  GoRoute(path: '/step-up', builder: (_, _) => const Text('step-up')),
];

Future<GoRouter> _pump(
  WidgetTester tester, {
  required ValueNotifier<UserSession> session,
  required String location,
  String? stepUpPath = '/step-up',
}) async {
  final registry = _registry();
  final router = buildShellRouter(
    registry: registry,
    platform: AppPlatform.web,
    runtime: fakeRuntime(registry: registry, session: session),
    routes: _shellPages,
    stepUpPath: stepUpPath,
    clock: _clock,
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
  );
  router.go(location);
  await tester.pumpAndSettle();
  return router;
}

Uri _uri(GoRouter router) => router.routerDelegate.currentConfiguration.uri;

Widget _scoped(ValueNotifier<UserSession> session, Widget child) =>
    Directionality(
      textDirection: TextDirection.ltr,
      child: ShellAccessScope(session: session, clock: _clock, child: child),
    );

void main() {
  setUp(resetDeferredPageCache);

  group('MFA routing', () {
    testWidgets('a stale second factor goes to the step-up page with from', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_admin),
        location: '/backoffice',
      );
      expect(_uri(router).path, '/step-up');
      expect(_uri(router).queryParameters['from'], '/backoffice');
    });

    testWidgets('a fresh second factor opens the page', (tester) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_admin.withMfaVerifiedAt(_now)),
        location: '/backoffice',
      );
      expect(_uri(router).path, '/backoffice');
    });

    testWidgets('after the step-up the router lets the user through', (
      tester,
    ) async {
      final session = ValueNotifier(_admin);
      final router = await _pump(
        tester,
        session: session,
        location: '/backoffice',
      );
      expect(_uri(router).path, '/step-up');

      session.value = session.value.withMfaVerifiedAt(_now);
      router.go(_uri(router).queryParameters['from']!);
      await tester.pumpAndSettle();
      expect(_uri(router).path, '/backoffice');
    });

    testWidgets('without stepUpPath the session goes to forbidden', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_admin),
        location: '/backoffice',
        stepUpPath: null,
      );
      expect(_uri(router).path, '/forbidden');
    });

    testWidgets('a session without the role is forbidden, not stepped up', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_reader.withMfaVerifiedAt(_now)),
        location: '/backoffice',
      );
      expect(_uri(router).path, '/forbidden');
    });

    test('a stepUpPath inside a microfrontend segment fails at startup', () {
      final registry = _registry();
      expect(
        () => buildShellRouter(
          registry: registry,
          platform: AppPlatform.web,
          runtime: fakeRuntime(
            registry: registry,
            session: ValueNotifier(UserSession.anonymous()),
          ),
          routes: _shellPages,
          stepUpPath: '/backoffice/step-up',
        ),
        throwsStateError,
      );
    });
  });

  group('sub-route guards', () {
    testWidgets('ScreenRoute.access guards /tasks/new', (tester) async {
      final denied = await _pump(
        tester,
        session: ValueNotifier(_reader),
        location: '/tasks/new',
      );
      expect(_uri(denied).path, '/forbidden');
      expect(_uri(denied).queryParameters['from'], '/tasks/new');

      final allowed = await _pump(
        tester,
        session: ValueNotifier(_writer),
        location: '/tasks/new',
      );
      expect(_uri(allowed).path, '/tasks/new');
      expect(find.text('new task'), findsOneWidget);
    });

    testWidgets('accessRedirect works in a hand-written GoRoute', (
      tester,
    ) async {
      final router = await _pump(
        tester,
        session: ValueNotifier(_reader),
        location: '/billing/admin',
      );
      expect(_uri(router).path, '/forbidden');
    });

    testWidgets(
      'accessRedirect reads a ShellAccessScope above a plain router',
      (tester) async {
        final session = ValueNotifier(_reader);
        final router = GoRouter(
          initialLocation: '/tasks/new',
          routes: [
            GoRoute(path: '/forbidden', builder: (_, _) => const Text('nope')),
            GoRoute(
              path: '/tasks/new',
              redirect: accessRedirect(
                AccessRule.permissions([Permission.tasksWrite]),
              ),
              builder: (_, _) => const Text('form'),
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          WidgetsApp.router(
            color: const Color(0xFF000000),
            routerConfig: router,
            builder: (context, child) =>
                ShellAccessScope(session: session, child: child!),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('nope'), findsOneWidget);
      },
    );

    test('redirectFor keeps the original location and skips shell pages', () {
      const paths = ShellPaths(stepUp: '/step-up');
      expect(
        redirectFor(
          AccessDecision.stepUpRequired,
          Uri.parse('/backoffice/sagas?page=2'),
          paths,
        ),
        '/step-up?from=%2Fbackoffice%2Fsagas%3Fpage%3D2',
      );
      expect(
        redirectFor(AccessDecision.denied, Uri.parse('/forbidden'), paths),
        isNull,
      );
      expect(
        redirectFor(AccessDecision.allowed, Uri.parse('/tasks'), paths),
        isNull,
      );
    });
  });

  group('AccessGate and context.can', () {
    testWidgets('shows the child only when allowed and follows the session', (
      tester,
    ) async {
      final session = ValueNotifier(_reader);
      await tester.pumpWidget(
        _scoped(
          session,
          AccessGate(
            rule: AccessRule.permissions([Permission.tasksWrite]),
            fallback: const Text('read only'),
            child: const Text('edit'),
          ),
        ),
      );
      expect(find.text('read only'), findsOneWidget);
      expect(find.text('edit'), findsNothing);

      session.value = _writer;
      await tester.pump();
      expect(find.text('edit'), findsOneWidget);
    });

    testWidgets('without fallback a denied gate renders nothing', (
      tester,
    ) async {
      await tester.pumpWidget(
        _scoped(
          ValueNotifier(_reader),
          AccessGate(
            rule: AccessRule.permissions([Permission.tasksWrite]),
            child: const Text('edit'),
          ),
        ),
      );
      expect(find.text('edit'), findsNothing);
    });

    testWidgets('context.can uses the scope clock for MFA rules', (
      tester,
    ) async {
      final session = ValueNotifier(_admin);
      late bool allowed;
      await tester.pumpWidget(
        _scoped(
          session,
          Builder(
            builder: (context) {
              allowed = context.can(_backofficeRule);
              return const SizedBox();
            },
          ),
        ),
      );
      expect(allowed, isFalse);
      session.value = _admin.withMfaVerifiedAt(
        _now.subtract(const Duration(minutes: 5)),
      );
      await tester.pump();
      expect(allowed, isTrue);
    });

    testWidgets('context.can without a scope fails loudly', (tester) async {
      Object? error;
      await tester.pumpWidget(
        Builder(
          builder: (context) {
            try {
              context.can(AccessRule.public());
            } catch (e) {
              error = e;
            }
            return const SizedBox();
          },
        ),
      );
      expect(error, isA<FlutterError>());
    });

    testWidgets('microfrontend pages get a ShellAccessScope from the router', (
      tester,
    ) async {
      final session = ValueNotifier(_writer);
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: MicrofrontendId.tasks,
            screens: [
              ScreenRoute(
                path: '/tasks',
                loadLibrary: () async {},
                builder: (scope, {params = const {}}) => AccessGate(
                  rule: AccessRule.permissions([Permission.tasksWrite]),
                  fallback: const Text('no button'),
                  child: const Text('new task button'),
                ),
              ),
            ],
          ),
        );
      final router = buildShellRouter(
        registry: registry,
        platform: AppPlatform.web,
        runtime: fakeRuntime(registry: registry, session: session),
        routes: _shellPages,
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
      );
      router.go('/tasks');
      await tester.pumpAndSettle();
      expect(find.text('new task button'), findsOneWidget);

      session.value = _reader;
      await tester.pumpAndSettle();
      expect(find.text('no button'), findsOneWidget);
    });
  });
}
