import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/fakes.dart';

final _reader = UserSession(userId: 'u', permissions: {Permission.tasksRead});

MicrofrontendRegistry _registry(List<MicrofrontendManifest> manifests) {
  final registry = MicrofrontendRegistry();
  for (final manifest in manifests) {
    registry.register(manifest);
  }
  return registry;
}

void main() {
  group(ShellNavigator, () {
    test('home is the path of the first menu entry the session sees', () {
      final registry = _registry([
        fakeManifest(id: TestIds.account, order: 3),
        fakeManifest(
          id: TestIds.tasks,
          order: 1,
          access: AccessRule.permissions([Permission.tasksRead]),
        ),
        fakeManifest(
          id: TestIds.billing,
          order: 2,
          platforms: {AppPlatform.web},
        ),
      ]);

      final reader = ShellNavigator(
        registry: registry,
        session: ValueNotifier<UserSession>(_reader),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );
      expect(reader.home(), '/tasks');

      final anonymousWeb = ShellNavigator(
        registry: registry,
        session: ValueNotifier<UserSession>(UserSession.anonymous()),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );
      expect(anonymousWeb.home(), '/billing');

      final anonymousMobile = ShellNavigator(
        registry: registry,
        session: ValueNotifier<UserSession>(UserSession.anonymous()),
        platform: AppPlatform.mobile,
        paths: const ShellPaths(),
      );
      expect(anonymousMobile.home(), '/account');
    });

    test('home is null when no entry is visible', () {
      final navigator = ShellNavigator(
        registry: _registry([
          fakeManifest(
            id: TestIds.tasks,
            access: AccessRule.permissions([Permission.tasksRead]),
          ),
        ]),
        session: ValueNotifier<UserSession>(UserSession.anonymous()),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );

      expect(navigator.home(), isNull);
    });

    test('a longer segment is not confused with a shorter one', () {
      final navigator = ShellNavigator(
        registry: _registry([
          fakeManifest(
            id: TestIds.tasks,
            order: 1,
            access: AccessRule.permissions([Permission.tasksRead]),
          ),
          fakeManifest(id: const MicrofrontendId('tasks2'), order: 2),
        ]),
        session: ValueNotifier<UserSession>(UserSession.anonymous()),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );

      expect(navigator.home(), '/tasks2');
    });

    test('landing is home when there is one, else forbidden for a signed-in '
        'user and login for an anonymous one', () {
      final registry = _registry([
        fakeManifest(
          id: TestIds.tasks,
          access: AccessRule.permissions([Permission.tasksRead]),
        ),
      ]);

      ShellNavigator navigatorFor(UserSession session, ShellPaths paths) =>
          ShellNavigator(
            registry: registry,
            session: ValueNotifier<UserSession>(session),
            platform: AppPlatform.web,
            paths: paths,
          );

      expect(
        navigatorFor(UserSession.anonymous(), const ShellPaths()).landing(),
        '/login',
      );
      expect(
        navigatorFor(UserSession(userId: 'u'), const ShellPaths()).landing(),
        '/forbidden',
      );
      expect(navigatorFor(_reader, const ShellPaths()).landing(), '/tasks');

      const customPaths = ShellPaths(login: '/signin', forbidden: '/denied');
      expect(
        navigatorFor(UserSession.anonymous(), customPaths).landing(),
        '/signin',
      );
      expect(
        navigatorFor(UserSession(userId: 'u'), customPaths).landing(),
        '/denied',
      );
    });

    test(
      'a signed-in user reaches an entry that needs a recent second factor',
      () {
        final registry = _registry([
          fakeManifest(
            id: TestIds.tasks,
            access: AccessRule.mfa(const Duration(minutes: 10)),
          ),
        ]);
        ShellNavigator navigatorFor(UserSession session) => ShellNavigator(
          registry: registry,
          session: ValueNotifier<UserSession>(session),
          platform: AppPlatform.web,
          paths: const ShellPaths(),
          clock: () => DateTime.utc(2026, 1, 1),
        );

        expect(navigatorFor(UserSession(userId: 'u')).home(), '/tasks');
        expect(navigatorFor(UserSession.anonymous()).home(), isNull);
      },
    );

    testWidgets(
      'signOutAndGoToLogin resets the session and goes to the plain login page',
      (tester) async {
        final router = GoRouter(
          initialLocation: '/tasks',
          routes: [
            GoRoute(path: '/login', builder: (_, _) => const Text('login')),
            GoRoute(path: '/tasks', builder: (_, _) => const Text('tasks')),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          WidgetsApp.router(
            color: const Color(0xFF000000),
            routerConfig: router,
          ),
        );

        final session = ValueNotifier<UserSession>(_reader);
        final navigator = ShellNavigator(
          registry: _registry(const []),
          session: session,
          platform: AppPlatform.web,
          paths: const ShellPaths(),
        );
        navigator.attach(router);

        await navigator.signOutAndGoToLogin();
        await tester.pumpAndSettle();

        expect(session.value.isAuthenticated, isFalse);
        expect(
          router.routerDelegate.currentConfiguration.uri.toString(),
          '/login',
        );
        expect(find.text('login'), findsOneWidget);
      },
    );

    testWidgets('attach twice throws StateError', (tester) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, _) => const SizedBox())],
      );
      addTearDown(router.dispose);
      final navigator = ShellNavigator(
        registry: _registry(const []),
        session: ValueNotifier<UserSession>(UserSession.anonymous()),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );

      navigator.attach(router);

      expect(() => navigator.attach(router), throwsStateError);
    });

    test('signOutAndGoToLogin before attach throws StateError', () async {
      final navigator = ShellNavigator(
        registry: _registry(const []),
        session: ValueNotifier<UserSession>(_reader),
        platform: AppPlatform.web,
        paths: const ShellPaths(),
      );

      await expectLater(navigator.signOutAndGoToLogin(), throwsStateError);
    });
  });
}
