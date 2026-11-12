import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/app.dart';
import 'package:mobile_shell/src/login/login_page.dart';
import 'package:mobile_shell/src/registry.dart';
import 'package:mobile_shell/src/router.dart';
import 'package:shell_core/shell_core.dart';

const _phoneSize = Size(390, 844);

Future<ValueNotifier<UserSession>> _pumpShell(
  WidgetTester tester, {
  UserSession? session,
}) async {
  tester.view.physicalSize = _phoneSize * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  tester.platformDispatcher.localeTestValue = const Locale('es');
  tester.platformDispatcher.localesTestValue = const [Locale('es')];
  addTearDown(tester.platformDispatcher.clearLocaleTestValue);

  final notifier = ValueNotifier<UserSession>(session ?? UserSession.anonymous());
  await tester.pumpWidget(
    MobileShellApp(registry: buildMobileRegistry(), session: notifier),
  );
  await tester.pump();
  return notifier;
}

GoRouter _router(WidgetTester tester) =>
    GoRouter.of(tester.element(find.byType(Navigator).first));

Future<void> _go(WidgetTester tester, String location) async {
  _router(tester).go(location);
  await tester.pump();
  await tester.pump();
}

/// Lets the lifecycles publish their first events (they run after a queue hop).
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump();
  }
}

String _location(WidgetTester tester) =>
    _router(tester).state.uri.toString();

final UserSession _client = UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
  planFeatures: {PlanFeature.aiAssistant},
);

final UserSession _clientNoAssistant = UserSession(
  userId: 'u2',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

/// Runtime over [registry] that follows [session], with its own event bus.
ShellRuntime _runtimeFor(MicrofrontendRegistry registry, ValueNotifier<UserSession> session) {
  late final ShellRuntime runtime;
  runtime = ShellRuntime(
    registry: registry,
    platform: AppPlatform.mobile,
    session: session,
    servicesFactory: (identity) =>
        DefaultShellServices(session: identity, eventBus: runtime.eventBus),
  );
  return runtime;
}

GoRouter _routerFor(
  MicrofrontendRegistry registry,
  ShellRuntime runtime,
  ValueNotifier<UserSession> session,
) => buildMobileRouter(
  registry: registry,
  runtime: runtime,
  session: session,
  unreadCount: ValueNotifier<int>(0),
  onSignOut: () async {},
);

/// Absolute paths of every GoRoute in [routes], nested ones included.
Iterable<String> _absolutePaths(List<RouteBase> routes) sync* {
  for (final route in routes) {
    if (route is GoRoute) {
      if (route.path.startsWith('/')) yield route.path;
      yield* _absolutePaths(route.routes);
    } else if (route is ShellRoute) {
      yield* _absolutePaths(route.routes);
    }
  }
}

void main() {
  testWidgets('anonymous visitor on a protected page goes to login with from', (tester) async {
    await _pumpShell(tester);
    await _go(tester, '/tasks');

    expect(_location(tester), '/login?from=%2Ftasks');
    expect(find.text('Modo demostración'), findsOneWidget);
  });

  testWidgets('signing in returns to the from location', (tester) async {
    await _pumpShell(tester);
    await _go(tester, '/tasks');

    await tester.tap(find.byKey(const ValueKey('demo-sign-in-client')));
    await tester.pumpAndSettle();

    expect(_location(tester), '/tasks');
    expect(find.text('Tareas'), findsWidgets);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });

  testWidgets('verifier tab is present on mobile for a client', (tester) async {
    await _pumpShell(tester, session: _client);
    await tester.pump();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Verificador'), findsOneWidget);
  });

  testWidgets('assistant tab is hidden for a client without the assistant plan', (tester) async {
    await _pumpShell(tester, session: _clientNoAssistant);
    await tester.pump();

    expect(find.text('Asistente'), findsNothing);
    expect(find.text('Verificador'), findsOneWidget);
    expect(find.text('Tareas'), findsOneWidget);
  });

  testWidgets('a session without the plan is sent to forbidden from the assistant route', (tester) async {
    await _pumpShell(tester, session: _clientNoAssistant);
    await _go(tester, '/assistant');

    expect(_location(tester), '/forbidden?from=%2Fassistant');
  });

  testWidgets('menu labels are in Spanish', (tester) async {
    await _pumpShell(tester, session: _client);
    await tester.pump();

    for (final label in ['Cuenta', 'Tareas', 'Notificaciones', 'Asistente', 'Verificador']) {
      expect(find.text(label), findsOneWidget, reason: label);
    }
  });

  testWidgets('sign-out is offered in the compact top bar of the shell', (tester) async {
    await _pumpShell(tester, session: _client);
    await _go(tester, '/tasks');

    expect(find.byIcon(Icons.logout), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('notifications entry shows the unread badge on mobile', (tester) async {
    await _pumpShell(tester, session: _client);
    await _settle(tester);

    expect(find.byType(Badge), findsOneWidget);
  });

  testWidgets('sign-out goes to login without from', (tester) async {
    await _pumpShell(tester, session: _client);
    await _go(tester, '/tasks');

    await tester.tap(find.byIcon(Icons.logout));
    await _settle(tester);

    expect(_location(tester), '/login');
    expect(find.text('Modo demostración'), findsOneWidget);
  });

  testWidgets('forbidden page offers sign-out', (tester) async {
    await _pumpShell(tester, session: _clientNoAssistant);
    await _go(tester, '/forbidden');

    expect(find.text('Acceso denegado'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Cerrar sesión'));
    await _settle(tester);

    expect(_location(tester), '/login');
  });

  test('router built from the real registry validates paths and lists each route once', () {
    final session = ValueNotifier<UserSession>(UserSession.anonymous());
    final registry = buildMobileRegistry();
    final runtime = _runtimeFor(registry, session);
    final router = _routerFor(registry, runtime, session);

    final paths = _absolutePaths(router.configuration.routes).toList();
    expect(paths.toSet(), hasLength(paths.length), reason: 'duplicated: $paths');
    expect(paths, containsAll(['/login', '/forbidden', '/tasks', '/notifications', '/verifier']));

    router.dispose();
    runtime.dispose();
    session.dispose();
  });

  test('a route outside its microfrontend prefix fails router construction', () {
    final session = ValueNotifier<UserSession>(UserSession.anonymous());
    final registry = MicrofrontendRegistry()
      ..register(
        MicrofrontendManifest(
          id: MicrofrontendId.tasks,
          platforms: {AppPlatform.mobile},
          access: AccessRule.public(),
          menu: const [],
          routes: (load, scope) => [
            GoRoute(path: '/billing', builder: (context, state) => const SizedBox.shrink()),
          ],
        ),
      );
    final runtime = _runtimeFor(registry, session);

    expect(() => _routerFor(registry, runtime, session), throwsStateError);

    runtime.dispose();
    session.dispose();
  });

  test('a new identity gets fresh scopes and the previous scope is disposed', () {
    final session = ValueNotifier<UserSession>(_client);
    final registry = buildMobileRegistry();
    final runtime = _runtimeFor(registry, session);

    final before = runtime.scopeFor(MicrofrontendId.tasks);
    session.value = _clientNoAssistant;
    final after = runtime.scopeFor(MicrofrontendId.tasks);

    expect(identical(before, after), isFalse);
    expect(after.services.session.userId, 'u2');
    expect(() => before.get<Object>((_) => Object()), throwsStateError);

    runtime.dispose();
    session.dispose();
  });

  test('safeReturnLocation rejects external targets', () {
    expect(safeReturnLocation(null), '/');
    expect(safeReturnLocation('/tasks/t1'), '/tasks/t1');
    expect(safeReturnLocation('https://evil.test/x'), '/');
    expect(safeReturnLocation('//evil.test/x'), '/');
    expect(safeReturnLocation(r'/\evil.test'), '/');
  });
}
