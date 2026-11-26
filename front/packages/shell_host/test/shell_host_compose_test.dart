import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:auth/auth.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';

import 'utils/probe_manifest.dart';
import 'utils/flow_harness.dart';
import 'utils/mounted_host.dart';

void main() {
  ShellHost web({IdentityConnection? connection, bool withBadge = false}) =>
      ShellHost(
        platform: AppPlatform.web,
        manifests: [ProbeManifest.build('alpha', withBadge: withBadge)],
        scaffold: (context, host, location, child) => child,
        connection: connection,
      );

  group('ShellHost', () {
    test('the menu follows the session', () {
      final host = web();
      addTearDown(host.dispose);

      expect(host.menu, isEmpty);

      host.session.value = SessionBuilder().build();

      expect(host.menu.map((entry) => entry.path), ['/alpha']);
    });

    testWidgets('sign-out leaves the session and goes to login', (
      tester,
    ) async {
      final host = web();
      await MountedHost(host).run(tester, () async {
        host.session.value = SessionBuilder().build();
        host.router.go('/alpha');
        await tester.pumpAndSettle();

        await host.signOut();
        await tester.pumpAndSettle();

        expect(host.session.value.isAuthenticated, isFalse);
        expect(
          host.router.routerDelegate.currentConfiguration.uri.path,
          '/login',
        );
      });
    });

    test('a connection makes the host live, without one it is demo', () {
      final live = web(
        connection: IdentityConnection(
          transport: ScriptedTransport.unavailable(),
          baseUri: Uri.parse('https://api.example.com'),
          tokenStore: FakeTokenStore(),
        ),
      );
      addTearDown(live.dispose);

      expect(live.binding, isNotNull);
      expect(live.mode, ShellMode.live);

      final demo = web();
      addTearDown(demo.dispose);

      expect(demo.binding, isNull);
      expect(demo.mode, ShellMode.demo);
    });

    test('compose wires the pieces and follows the connection', () async {
      final harness = FlowHarness();
      final registry = MicrofrontendRegistry()
        ..register(ProbeManifest.build('alpha'));
      final session = ValueNotifier(UserSession.anonymous());
      final runtime = ShellRuntime(
        registry: registry,
        platform: AppPlatform.web,
        session: session,
        servicesFactory: (identity) =>
            ShellServices(session: identity, mode: ShellMode.demo),
      );
      final router = GoRouter(
        routes: [
          GoRoute(path: '/', builder: (context, state) => const SizedBox()),
        ],
      );
      final navigator = ShellNavigator(
        registry: registry,
        session: session,
        platform: AppPlatform.web,
        paths: ShellHost.paths,
      )..attach(router);
      final stepUp = StepUpRequests(path: '/step-up')..attach(router);
      final host = ShellHost.compose(
        platform: AppPlatform.web,
        registry: registry,
        session: session,
        runtime: runtime,
        router: router,
        navigator: navigator,
        menuBadges: MenuBadges(registry: registry, bus: runtime.eventBus),
        stepUp: stepUp,
        scaffoldMessengerKey: GlobalKey<ScaffoldMessengerState>(),
        binding: SessionBinding(
          connection: harness.connection,
          session: session,
          navigator: navigator,
        ),
        connection: harness.connection,
      );
      addTearDown(host.dispose);

      await harness.signIn();
      await pumpEventQueue();

      expect(host.session.value.isAuthenticated, isTrue);
    });

    testWidgets('an open step-up is answered false when the identity changes', (
      tester,
    ) async {
      final host = web();
      await MountedHost(host).run(tester, () async {
        host.session.value = UserSession(userId: 'u1', tenantId: 't1');
        await tester.pumpAndSettle();

        bool? answer;
        unawaited(host.requestStepUp().then((value) => answer = value));
        await tester.pumpAndSettle();

        host.session.value = UserSession(userId: 'u2', tenantId: 't1');
        await tester.pumpAndSettle();

        expect(answer, isFalse);
      });
    });
  });
}
