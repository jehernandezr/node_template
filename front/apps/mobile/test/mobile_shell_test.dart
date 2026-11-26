import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/mobile_shell.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import 'utils/mobile_shell_fixture.dart';

void main() {
  setUpAll(
    () => const DeferredLibrariesPreloader().load([
      ...mobileManifests,
      const ScenarioProbe().manifest(),
    ]),
  );
  defineShellScenarios(MobileShellFixture(), platform: 'mobile');

  group('mobile shell', () {
    testWidgets('verifier tab is present on mobile for a client', (
      tester,
    ) async {
      await MobileShellFixture().run(
        tester,
        _Setups.of(_Sessions.client(), initialLocation: '/'),
        (host) async {
          expect(find.byType(NavigationBar), findsOneWidget);
          expect(find.text('Verificador'), findsOneWidget);
        },
      );
    });

    testWidgets(
      'assistant tab is hidden for a client without the assistant plan',
      (tester) async {
        await MobileShellFixture().run(
          tester,
          _Setups.of(_Sessions.clientNoAssistant(), initialLocation: '/'),
          (host) async {
            expect(find.text('Asistente'), findsNothing);
            expect(find.text('Verificador'), findsOneWidget);
            expect(find.text('Tareas'), findsOneWidget);
          },
        );
      },
    );

    testWidgets(
      'a session without the plan is sent to forbidden from the assistant route',
      (tester) async {
        await MobileShellFixture().run(
          tester,
          _Setups.of(
            _Sessions.clientNoAssistant(),
            initialLocation: '/assistant',
          ),
          (host) async {
            expect(
              host.router.state.uri.toString(),
              '/forbidden?from=%2Fassistant',
            );
          },
        );
      },
    );

    testWidgets('menu labels are in Spanish', (tester) async {
      await MobileShellFixture().run(
        tester,
        _Setups.of(_Sessions.client(), initialLocation: '/'),
        (host) async {
          for (final label in [
            'Cuenta',
            'Tareas',
            'Notificaciones',
            'Asistente',
            'Verificador',
          ]) {
            expect(find.text(label), findsOneWidget, reason: label);
          }
        },
      );
    });

    testWidgets(
      'on compact widths the screen owns the only top bar and shows sign-out',
      (tester) async {
        await MobileShellFixture().run(
          tester,
          _Setups.of(_Sessions.client(), initialLocation: ScenarioProbe.home),
          (host) async {
            await tester.pump(const Duration(seconds: 1));

            expect(find.text(ScenarioProbe.homeTitle), findsOneWidget);
            expect(
              find.byType(AppBar),
              findsOneWidget,
              reason: 'the shell draws no bar',
            );
            expect(
              find.descendant(
                of: find.byType(AppPage),
                matching: find.byIcon(Icons.logout),
              ),
              findsOneWidget,
            );
            expect(find.byType(NavigationBar), findsOneWidget);
          },
        );
      },
    );

    testWidgets(
      'the shell draws no compact bar of its own over a microfrontend screen',
      (tester) async {
        await MobileShellFixture().run(
          tester,
          _Setups.of(_Sessions.client(), initialLocation: '/tasks'),
          (host) async {
            expect(
              find.ancestor(
                of: find.byType(Navigator).last,
                matching: find.byType(AppBar),
              ),
              findsNothing,
            );
            expect(find.byType(NavigationBar), findsOneWidget);
          },
        );
      },
    );

    testWidgets('notifications entry shows the unread badge on mobile', (
      tester,
    ) async {
      await MobileShellFixture().run(
        tester,
        _Setups.of(_Sessions.client(), initialLocation: '/'),
        (host) async {
          await tester.pumpAndSettle();

          expect(find.byType(Badge), findsOneWidget);
        },
      );
    });

    testWidgets('sign-out goes to login without from', (tester) async {
      await MobileShellFixture().run(
        tester,
        _Setups.of(_Sessions.client(), initialLocation: ScenarioProbe.home),
        (host) async {
          await tester.pump(const Duration(seconds: 1));

          await tester.tap(find.byIcon(Icons.logout));
          await tester.pumpAndSettle();

          expect(host.router.state.uri.toString(), '/login');
          expect(find.text('Modo demostración'), findsOneWidget);
        },
      );
    });
  });

  test('the router of the real manifests lists each route once', () {
    final host = buildMobileHost();
    addTearDown(host.dispose);

    final paths = RoutePaths(host.router.configuration.routes);
    expect(paths.duplicated, isEmpty, reason: 'duplicated: ${paths.all}');
    expect(
      paths.all,
      containsAll([
        '/login',
        '/forbidden',
        '/tasks',
        '/notifications',
        '/reports',
        '/verifier',
      ]),
    );
  });
}

/// Scenario setups of the mobile tests over the probe and the mobile manifests.
abstract final class _Setups {
  static ShellScenarioSetup of(
    UserSession session, {
    String initialLocation = '/',
  }) => ShellScenarioSetup(
    manifests: [const ScenarioProbe().manifest()],
    clock: FakeClock(),
    session: session,
    initialLocation: initialLocation,
  );
}

/// Sessions of the mobile scenarios: a client with the assistant plan and one
/// without it.
abstract final class _Sessions {
  static UserSession client() => SessionBuilder(userId: 'u1', tenantId: 't1')
      .withPermissions(const [Permission.tasksRead])
      .withFeatures(const [PlanFeature.aiAssistant])
      .build();

  static UserSession clientNoAssistant() => SessionBuilder(
    userId: 'u2',
    tenantId: 't1',
  ).withPermissions(const [Permission.tasksRead]).build();
}
