import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/mf_notifications.dart' show UnreadCountChanged;
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:web_shell/src/web_shell.dart';

import 'utils/web_shell_fixture.dart';

void main() {
  setUpAll(
    () => const DeferredLibrariesPreloader().load([
      ...webManifests,
      const ScenarioProbe().manifest(),
    ]),
  );
  defineShellScenarios(const WebShellFixture(), platform: 'web');

  group('web shell', () {
    testWidgets(
      'customer sees the menu without backoffice or billing',
      (tester) =>
          const WebShellFixture().run(tester, _Setups.atLogin(), (host) async {
            await _Steps(tester).demoSignIn('Entrar como cliente');

            expect(find.text('Cuenta'), findsWidgets);
            expect(find.text('Tareas'), findsWidgets);
            expect(find.text('Administración'), findsNothing);
            expect(find.text('Facturación'), findsNothing);
          }),
    );

    testWidgets(
      'superadmin sees the backoffice in the menu',
      (tester) =>
          const WebShellFixture().run(tester, _Setups.atLogin(), (host) async {
            await _Steps(tester).demoSignIn('Entrar como superadministrador');

            expect(find.text('Administración'), findsWidgets);
            expect(find.text('Tareas'), findsNothing);
          }),
    );

    testWidgets(
      'customer visiting /backoffice goes to forbidden',
      (tester) =>
          const WebShellFixture().run(tester, _Setups.atLogin(), (host) async {
            await _Steps(tester).demoSignIn('Entrar como cliente');

            host.router.go('/backoffice');
            await tester.pumpAndSettle();

            expect(host.router.state.uri.path, '/forbidden');
            expect(find.text('Acceso denegado'), findsOneWidget);
          }),
    );

    testWidgets(
      'sign-out returns to login without from',
      (tester) =>
          const WebShellFixture().run(tester, _Setups.atLogin(), (host) async {
            final steps = _Steps(tester);
            await steps.demoSignIn('Entrar como administrador del tenant');
            expect(host.router.state.uri.toString(), '/account');

            await steps.signOutFromFrame();

            expect(host.router.state.uri.path, '/login');
            expect(
              host.router.state.uri.queryParameters.containsKey('from'),
              isFalse,
            );
            expect(host.session.value.isAuthenticated, isFalse);
            expect(find.text('Modo demostración'), findsOneWidget);
          }),
    );

    testWidgets(
      'menu labels are localized in Spanish',
      (tester) =>
          const WebShellFixture().run(tester, _Setups.atLogin(), (host) async {
            await _Steps(tester)
                .demoSignIn('Entrar como administrador del tenant');

            expect(find.text('Cuenta'), findsWidgets);
            expect(find.text('Tareas'), findsWidgets);
            expect(find.text('Facturación'), findsWidgets);
            expect(find.text('Asistente'), findsWidgets);
            expect(find.text('Notificaciones'), findsWidgets);
          }),
    );

    testWidgets(
      'unread badge shows the count from UnreadCountChanged and updates',
      (tester) => const WebShellFixture().run(tester, _Setups.atLogin(), (
        host,
      ) async {
        await _Steps(tester).demoSignIn('Entrar como administrador del tenant');

        Finder badgeText(String text) =>
            find.descendant(of: find.byType(Badge), matching: find.text(text));

        host.runtime.eventBus.emit(const UnreadCountChanged(4));
        await tester.pumpAndSettle();
        expect(badgeText('4'), findsOneWidget);

        host.runtime.eventBus.emit(const UnreadCountChanged(12));
        await tester.pumpAndSettle();
        expect(badgeText('12'), findsOneWidget);
        expect(badgeText('4'), findsNothing);

        host.runtime.eventBus.emit(const UnreadCountChanged(0));
        await tester.pumpAndSettle();
        expect(find.byType(Badge), findsNothing);
      }),
    );

    testWidgets(
      'user isolation: a task created by the tenant admin is not seen by a customer',
      (tester) => const WebShellFixture().run(tester, _Setups.atLogin(), (
        host,
      ) async {
        const adminTask = 'Tarea solo del admin';
        final steps = _Steps(tester);

        await steps.demoSignIn('Entrar como administrador del tenant');
        // Open the list once so its deferred library and seed data are ready.
        host.router.go('/tasks');
        await steps.waitFor(find.text('Revisar facturas de proveedores'));

        // The admin's repository lives in the tasks scope of this identity.
        // Create the task through that same scope, then check the admin's
        // list shows it.
        final adminRepository = host.runtime
            .scopeFor(const MicrofrontendId('tasks'))
            .get<TasksRepository>((services) => FakeTasksRepository());
        // The fake repository waits on a real delay, so run it outside the
        // fake clock.
        await tester.runAsync(
          () => adminRepository.create(const TaskDraft(title: adminTask)),
        );

        host.router.go('/account');
        await tester.pumpAndSettle();
        host.router.go('/tasks');
        await steps.waitFor(find.text(adminTask));
        expect(find.text(adminTask), findsOneWidget);

        await steps.signOutFromFrame();
        await steps.demoSignIn('Entrar como cliente');
        host.router.go('/tasks');
        await steps.waitFor(find.text('Revisar facturas de proveedores'));

        expect(find.text('Revisar facturas de proveedores'), findsOneWidget);
        expect(find.text(adminTask), findsNothing);
      }),
    );
  });

  group('web routes', () {
    test('no duplicate routes: each route path appears once', () {
      final host = buildWebHost();
      addTearDown(host.dispose);

      final routes = RoutePaths(host.router.configuration.routes);

      expect(routes.duplicated, isEmpty);
      expect(routes.all.where((path) => path == '/tasks'), hasLength(1));
      expect(routes.all.where((path) => path == '/reports'), hasLength(1));
      expect(routes.all.where((path) => path == '/login'), hasLength(1));
      expect(routes.all.where((path) => path == '/forbidden'), hasLength(1));
    });

    test('in live mode only what has a real adapter is offered', () {
      final host = buildWebHost(
        connection: const ScenarioIdentity().build(FakeAuthRepository()),
      );
      addTearDown(host.dispose);

      for (final path in ['/tasks', '/notifications', '/billing', '/reports']) {
        expect(host.registry.manifestForPath(path), isNotNull, reason: path);
      }
      for (final path in ['/assistant', '/backoffice']) {
        expect(host.registry.manifestForPath(path), isNull, reason: path);
      }
    });
  });
}

/// Setups of the web-only scenarios.
abstract final class _Setups {
  /// Anonymous shell opened at the sign-in page, with the demo profiles.
  static ShellScenarioSetup atLogin() => ShellScenarioSetup(
    manifests: const [],
    clock: FakeClock(),
    initialLocation: '/login',
  );
}

/// Steps the web-only scenarios repeat on screen.
final class _Steps {
  const _Steps(this.tester);

  final WidgetTester tester;

  /// Taps the demo profile labelled [label] and settles.
  Future<void> demoSignIn(String label) async {
    await tester.tap(find.text(label));
    await tester.pumpAndSettle();
  }

  /// Signs out with the frame's sign-out action.
  Future<void> signOutFromFrame() async {
    await tester.tap(find.byTooltip('Cerrar sesión'));
    await tester.pumpAndSettle();
  }

  /// Pumps until [finder] matches, up to five seconds of fake time.
  Future<void> waitFor(Finder finder) async {
    for (var i = 0; i < 50 && finder.evaluate().isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(finder.evaluate().isNotEmpty, isTrue, reason: 'never found $finder');
  }
}
