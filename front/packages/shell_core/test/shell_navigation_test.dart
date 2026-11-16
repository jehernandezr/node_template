import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/fakes.dart';

void main() {
  group('homeLocation', () {
    final registry = MicrofrontendRegistry()
      ..register(fakeManifest(id: TestIds.account, order: 3))
      ..register(
        fakeManifest(
          id: TestIds.tasks,
          order: 1,
          access: AccessRule.permissions([Permission.tasksRead]),
        ),
      )
      ..register(
        fakeManifest(
          id: TestIds.billing,
          order: 2,
          platforms: {AppPlatform.web},
        ),
      );

    test('is the first visible menu entry for the session and platform', () {
      final reader = UserSession(
        userId: 'u',
        permissions: {Permission.tasksRead},
      );
      expect(homeLocation(registry, reader, AppPlatform.web), '/tasks');
      expect(homeLocation(registry, reader, AppPlatform.mobile), '/tasks');
      expect(
        homeLocation(registry, UserSession.anonymous(), AppPlatform.web),
        '/billing',
      );
      expect(
        homeLocation(registry, UserSession.anonymous(), AppPlatform.mobile),
        '/account',
      );
    });

    test('is null when no entry is visible', () {
      final empty = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: TestIds.tasks,
            access: AccessRule.permissions([Permission.tasksRead]),
          ),
        );
      expect(
        homeLocation(empty, UserSession.anonymous(), AppPlatform.web),
        isNull,
      );
    });
  });

  testWidgets(
    'signOutAndGoToLogin resets the session and drops the from parameter',
    (tester) async {
      final session = ValueNotifier(
        UserSession(
          userId: 'u1',
          tenantId: 't1',
          permissions: {Permission.tasksRead},
        ),
      );
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: TestIds.tasks,
            access: AccessRule.permissions([Permission.tasksRead]),
          ),
        );
      final runtime = fakeRuntime(registry: registry, session: session);
      final router = buildShellRouter(
        registry: registry,
        platform: AppPlatform.web,
        runtime: runtime,
        routes: [
          GoRoute(path: '/login', builder: (_, _) => const Text('login')),
          GoRoute(
            path: '/forbidden',
            builder: (_, _) => const Text('forbidden'),
          ),
        ],
        shellBuilder: passThroughShell,
      );
      await tester.pumpWidget(
        WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
      );
      router.go('/tasks');
      await tester.pumpAndSettle();
      expect(router.routerDelegate.currentConfiguration.uri.path, '/tasks');

      await signOutAndGoToLogin(router: router, session: session);
      await tester.pumpAndSettle();

      expect(session.value, UserSession.anonymous());
      final uri = router.routerDelegate.currentConfiguration.uri;
      expect(uri.path, '/login');
      expect(uri.queryParameters.containsKey('from'), isFalse);
    },
  );
}
