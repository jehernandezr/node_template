import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:web_shell/src/app.dart';
import 'package:web_shell/src/pages/web_shell_scaffold.dart';
import 'package:web_shell/src/screen_loader.dart';
import 'package:web_shell/src/web_shell.dart';

/// Pumps the shell in Spanish, optionally navigating to [location] first.
Future<WebShell> pumpShell(
  WidgetTester tester, {
  String? location,
  MicrofrontendRegistry? registry,
  IdentityConnection? connection,
}) async {
  tester.platformDispatcher.localesTestValue = const [Locale('es')];
  addTearDown(tester.platformDispatcher.clearLocalesTestValue);
  ignoreAhemOverflow();

  final shell = WebShell(registry: registry, connection: connection);
  await tester.pumpWidget(WebShellApp(shell: shell));
  addTearDown(() async {
    // Let queued identity syncs finish first; otherwise dispose races them.
    // The pending work waits on timers created in the test's fake time, so
    // advance fake time instead of waiting in real time (runAsync never ends).
    var idle = false;
    shell.runtime.whenIdle().then((_) => idle = true);
    for (var i = 0; i < 100 && !idle; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pumpWidget(const SizedBox());
  });
  if (location != null) shell.router.go(location);
  await settle(tester);
  return shell;
}

/// flutter_test draws text with the Ahem font (one em per glyph), so the longer
/// Spanish labels of `AppButton` overflow its width here. Real fonts fit. Only
/// that overflow is ignored; every other error still fails the test.
void ignoreAhemOverflow() {
  final previous = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exceptionAsString().contains('RenderFlex overflowed')) return;
    previous?.call(details);
  };
  addTearDown(() => FlutterError.onError = previous);
}

Future<void> demoSignIn(WidgetTester tester, String label) async {
  await tester.tap(find.text(label));
  await settle(tester);
}

Future<void> signOutFromShell(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Cerrar sesión'));
  await settle(tester);
}

/// Pumps until [finder] matches, up to about five seconds of fake time.
Future<void> waitFor(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 50 && finder.evaluate().isEmpty; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// Pumps a few frames. Screens may show spinners forever, so pumpAndSettle would time out.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 30; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

String location(WebShell shell) => shell.router.state.uri.toString();

/// Full path of every GoRoute in the router tree, nested routes included.
List<String> routePaths(List<RouteBase> routes, [String parent = '']) {
  final paths = <String>[];
  for (final route in routes) {
    if (route is GoRoute) {
      final full = route.path.startsWith('/')
          ? route.path
          : '$parent/${route.path}';
      paths.add(full);
      paths.addAll(routePaths(route.routes, full));
    } else if (route is ShellRoute) {
      paths.addAll(routePaths(route.routes, parent));
    }
  }
  return paths;
}

void main() {
  setUp(resetDeferredPageCache);

  testWidgets('anonymous visitor to /tasks lands on login with from', (
    tester,
  ) async {
    final shell = await pumpShell(tester, location: '/tasks');

    expect(shell.router.state.uri.path, '/login');
    expect(shell.router.state.uri.queryParameters['from'], '/tasks');
    expect(find.text('Modo demostración'), findsOneWidget);
  });

  testWidgets('demo sign-in returns to the requested page', (tester) async {
    final shell = await pumpShell(tester, location: '/tasks');

    await demoSignIn(tester, 'Entrar como cliente');

    expect(location(shell), '/tasks');
    expect(find.text('Modo demostración'), findsNothing);
    expect(find.byType(WebShellScaffold), findsOneWidget);
  });

  testWidgets('customer sees the menu without backoffice or billing', (
    tester,
  ) async {
    await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como cliente');

    expect(find.text('Cuenta'), findsWidgets);
    expect(find.text('Tareas'), findsWidgets);
    expect(find.text('Administración'), findsNothing);
    expect(find.text('Facturación'), findsNothing);
  });

  testWidgets('superadmin sees the backoffice in the menu', (tester) async {
    await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como superadministrador');

    expect(find.text('Administración'), findsWidgets);
    expect(find.text('Tareas'), findsNothing);
  });

  testWidgets('customer visiting /backoffice goes to forbidden', (
    tester,
  ) async {
    final shell = await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como cliente');

    shell.router.go('/backoffice');
    await settle(tester);

    expect(shell.router.state.uri.path, '/forbidden');
    expect(find.text('Acceso denegado'), findsOneWidget);
  });

  testWidgets('forbidden page offers sign-out back to login', (tester) async {
    final shell = await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como cliente');
    shell.router.go('/backoffice');
    await settle(tester);

    await tester.tap(find.widgetWithText(AppButton, 'Cerrar sesión'));
    await settle(tester);

    expect(shell.router.state.uri.path, '/login');
    expect(shell.session.value.isAuthenticated, isFalse);
  });

  testWidgets('sign-out returns to login without from', (tester) async {
    final shell = await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como administrador del tenant');
    expect(location(shell), '/account');

    await signOutFromShell(tester);

    expect(shell.router.state.uri.path, '/login');
    expect(shell.router.state.uri.queryParameters.containsKey('from'), isFalse);
    expect(shell.session.value.isAuthenticated, isFalse);
    expect(find.text('Modo demostración'), findsOneWidget);
  });

  testWidgets('menu labels are localized in Spanish', (tester) async {
    await pumpShell(tester, location: '/login');
    await demoSignIn(tester, 'Entrar como administrador del tenant');

    expect(find.text('Cuenta'), findsWidgets);
    expect(find.text('Tareas'), findsWidgets);
    expect(find.text('Facturación'), findsWidgets);
    expect(find.text('Asistente'), findsWidgets);
    expect(find.text('Notificaciones'), findsWidgets);
  });

  testWidgets(
    'unread badge shows the count from UnreadCountChanged and updates',
    (tester) async {
      final shell = await pumpShell(tester, location: '/login');
      await demoSignIn(tester, 'Entrar como administrador del tenant');

      Finder badgeText(String text) =>
          find.descendant(of: find.byType(Badge), matching: find.text(text));

      shell.runtime.eventBus.emit(const UnreadCountChanged(4));
      await settle(tester);
      expect(badgeText('4'), findsOneWidget);

      shell.runtime.eventBus.emit(const UnreadCountChanged(12));
      await settle(tester);
      expect(badgeText('12'), findsOneWidget);
      expect(badgeText('4'), findsNothing);

      shell.runtime.eventBus.emit(const UnreadCountChanged(0));
      await settle(tester);
      expect(find.byType(Badge), findsNothing);
    },
  );

  testWidgets('no duplicate routes: each route path appears once', (
    tester,
  ) async {
    final shell = await pumpShell(tester);

    final paths = routePaths(shell.router.configuration.routes);
    final duplicates = {
      for (final path in paths)
        if (paths.where((other) => other == path).length > 1) path,
    };

    expect(duplicates, isEmpty);
    expect(paths.where((path) => path == '/tasks'), hasLength(1));
    expect(paths.where((path) => path == '/login'), hasLength(1));
    expect(paths.where((path) => path == '/forbidden'), hasLength(1));
  });

  testWidgets('a failed deferred load shows the localized error and retries', (
    tester,
  ) async {
    tester.platformDispatcher.localesTestValue = const [Locale('es')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    ignoreAhemOverflow();

    var attempts = 0;
    Future<void> failingLoad() async {
      attempts++;
      throw StateError('offline');
    }

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        supportedLocales: supportedLocales,
        home: Scaffold(
          body: loadScreen(
            loadLibrary: failingLoad,
            builder: () => const Text('pantalla'),
          ),
        ),
      ),
    );
    await settle(tester);

    expect(attempts, 1);
    expect(find.text('Algo salió mal. Intenta de nuevo.'), findsOneWidget);
    expect(find.text('pantalla'), findsNothing);

    await tester.tap(find.text('Reintentar'));
    await settle(tester);

    expect(attempts, 2);
  });

  testWidgets(
    'user isolation: a task created by the tenant admin is not seen by a customer',
    (tester) async {
      const adminTask = 'Tarea solo del admin';
      final shell = await pumpShell(tester, location: '/login');

      await demoSignIn(tester, 'Entrar como administrador del tenant');
      // Open the list once so its deferred library and seed data are ready.
      shell.router.go('/tasks');
      await waitFor(tester, find.text('Revisar facturas de proveedores'));

      // The admin's repository lives in the tasks scope of this identity. Create the
      // task through that same scope, then check the admin's list shows it.
      final adminRepository = shell.runtime
          .scopeFor(MicrofrontendId.tasks)
          .get<TasksRepository>((services) => FakeTasksRepository());
      // The fake repository waits on a real delay, so run it outside the fake clock.
      await tester.runAsync(
        () => adminRepository.create(const TaskDraft(title: adminTask)),
      );

      shell.router.go('/account');
      await settle(tester);
      shell.router.go('/tasks');
      await waitFor(tester, find.text(adminTask));
      expect(find.text(adminTask), findsOneWidget);

      await signOutFromShell(tester);
      await demoSignIn(tester, 'Entrar como cliente');
      shell.router.go('/tasks');
      await waitFor(tester, find.text('Revisar facturas de proveedores'));

      expect(find.text('Revisar facturas de proveedores'), findsOneWidget);
      expect(find.text(adminTask), findsNothing);
    },
  );

  testWidgets('identity switch: a mounted route shows the new user\'s data', (
    tester,
  ) async {
    final shell = await pumpShell(tester, registry: registryWithProbe());
    shell.session.value = probeUser('u1');
    shell.router.go('/verifier');
    await waitFor(tester, find.text('usuario u1'));
    expect(find.text('usuario u1'), findsOneWidget);

    shell.session.value = probeUser('u2');
    await settle(tester);

    expect(location(shell), '/verifier');
    expect(find.text('usuario u2'), findsOneWidget);
    expect(find.text('usuario u1'), findsNothing);
  });

  testWidgets('identity switch clears the previous user\'s snack bars', (
    tester,
  ) async {
    final shell = await pumpShell(tester, registry: registryWithProbe());
    shell.session.value = probeUser('u1');
    shell.router.go('/verifier');
    await waitFor(tester, find.text('usuario u1'));

    showActionError(
      tester.element(find.text('usuario u1')),
      StateError('x'),
      message: 'Error de u1',
    );
    await tester.pump();
    expect(find.text('Error de u1'), findsWidgets);

    shell.session.value = probeUser('u2');
    await settle(tester);
    expect(find.text('Error de u1'), findsNothing);
  });

  testWidgets(
    'an MFA sub-route sends to /step-up and returns after verifying',
    (tester) async {
      final shell = await pumpShell(tester, registry: registryWithProbe());
      shell.session.value = probeUser('u1');
      shell.router.go('/verifier/secure');
      await settle(tester);

      expect(shell.router.state.uri.path, WebShell.stepUpPath);
      expect(
        shell.router.state.uri.queryParameters['from'],
        '/verifier/secure',
      );
      expect(find.text('Verificación adicional'), findsOneWidget);

      await tester.tap(find.text('Verificar (demostración)'));
      await settle(tester);

      expect(location(shell), '/verifier/secure');
      expect(find.text('zona segura'), findsOneWidget);
      expect(shell.session.value.mfaVerifiedAt, isNotNull);
    },
  );

  testWidgets(
    'requestStepUp of the services opens /step-up and returns true after '
    'verifying, keeping the page that asked',
    (tester) async {
      final shell = await pumpShell(tester, registry: registryWithProbe());
      shell.session.value = probeUser('u1');
      shell.router.go('/verifier');
      await settle(tester);
      expect(find.text('usuario u1'), findsOneWidget);

      final services = shell.runtime
          .scopeFor(MicrofrontendId.verifier)
          .services;
      bool? verified;
      services.requestStepUp().then((value) => verified = value);
      await settle(tester);
      expect(find.text('Verificación adicional'), findsOneWidget);

      await tester.tap(find.text('Verificar (demostración)'));
      await settle(tester);

      expect(verified, isTrue);
      expect(shell.session.value.mfaVerifiedAt, isNotNull);
      expect(find.text('Verificación adicional'), findsNothing);
      expect(
        shell.router.routerDelegate.currentConfiguration.uri.path,
        '/verifier',
      );
      expect(find.text('usuario u1'), findsOneWidget);
    },
  );

  testWidgets('requestStepUp returns false when the user goes back', (
    tester,
  ) async {
    final shell = await pumpShell(tester, registry: registryWithProbe());
    shell.session.value = probeUser('u1');
    shell.router.go('/verifier');
    await settle(tester);

    bool? verified;
    shell.requestStepUp().then((value) => verified = value);
    await settle(tester);
    await tester.tap(find.byType(BackButton));
    await settle(tester);

    expect(verified, isFalse);
    expect(shell.session.value.mfaVerifiedAt, isNull);
    expect(find.text('usuario u1'), findsOneWidget);
    expect(
      shell.router.routerDelegate.currentConfiguration.uri.path,
      '/verifier',
    );
  });

  testWidgets('requestStepUp returns false when a go replaces the page', (
    tester,
  ) async {
    final shell = await pumpShell(tester, registry: registryWithProbe());
    shell.session.value = probeUser('u1');
    shell.router.go('/verifier');
    await settle(tester);

    bool? verified;
    shell.requestStepUp().then((value) => verified = value);
    await settle(tester);
    expect(find.text('Verificación adicional'), findsOneWidget);

    // A menu entry or a deep link navigates with go, not pop.
    shell.router.go('/account');
    await settle(tester);

    expect(verified, isFalse);
    expect(shell.stepUp.isPending, isFalse);
    expect(find.text('Verificación adicional'), findsNothing);
  });

  group('with a real identity connection', () {
    late FakeAuthRepository repository;
    late IdentityConnection connection;
    late List<SessionAccess> served;

    // Built inside each test: futures created in setUp live outside the
    // fake async zone of testWidgets and never complete there.
    void prepare() {
      repository = FakeAuthRepository();
      served = [
        access(const [Permission.tasksRead]),
      ];
      final manager = SessionManager(
        repository: repository,
        tokenStore: const CookieTokenStore(),
      );
      connection = IdentityConnection.withParts(
        sessionManager: manager,
        apiClient: ApiClient(
          transport: _NoNetwork(),
          baseUri: Uri.parse('https://api.example.com'),
          accessToken: manager.accessToken,
        ),
        loadAccess: () async => served.removeAt(0),
      );
    }

    testWidgets('the sign-in page runs the MFA flow and the session comes '
        'from /v1/me/access', (tester) async {
      prepare();
      repository.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: PendingMfa(mfaToken: 'mfa-1', methods: [MfaFactor.emailOtp]),
      );
      repository.challengeResult = MfaChallenge(
        challengeId: challengeId,
        method: MfaFactor.emailOtp,
        expiresAt: DateTime.now().add(const Duration(minutes: 5)),
        codeLength: MfaRules.emailCodeLength,
      );
      repository.verifyResult = authenticated();
      final shell = await pumpShell(
        tester,
        location: '/tasks',
        connection: connection,
      );
      expect(shell.router.state.uri.path, '/login');
      expect(find.text('Entrar como cliente'), findsNothing);

      await tester.enterText(
        find.byKey(const ValueKey('sign-in-email')),
        'ana@example.com',
      );
      await tester.enterText(
        find.byKey(const ValueKey('sign-in-password')),
        'secret',
      );
      await tester.tap(find.text('Iniciar sesión').last);
      await settle(tester);
      await tester.tap(find.text('Código por email'));
      await settle(tester);
      await tester.enterText(
        find.byKey(const ValueKey('sign-in-code')),
        '123456',
      );
      await tester.tap(find.text('Verificar'));
      await settle(tester);

      expect(repository.lastChallengeRequest?.method, MfaFactor.emailOtp);
      expect(repository.lastVerify?.challengeId, challengeId);
      expect(shell.session.value.userId, userId);
      expect(shell.session.value.permissions, {Permission.tasksRead});
      expect(shell.router.state.uri.path, '/tasks');
      expect(
        shell.runtime
            .scopeFor(MicrofrontendId.tasks)
            .services
            .extra<ApiClient>(),
        same(connection.apiClient),
      );
    });

    testWidgets('a wrong password shows the contract message', (tester) async {
      prepare();
      await pumpShell(tester, connection: connection);

      await tester.enterText(
        find.byKey(const ValueKey('sign-in-email')),
        'ana@example.com',
      );
      await tester.enterText(
        find.byKey(const ValueKey('sign-in-password')),
        'wrong',
      );
      await tester.tap(find.text('Iniciar sesión').last);
      await settle(tester);

      expect(
        find.text('El email o la contraseña no son correctos.'),
        findsOneWidget,
      );
    });

    testWidgets('when identity closes the session the user goes to login', (
      tester,
    ) async {
      prepare();
      repository.signInResult = authenticated();
      final shell = await pumpShell(tester, connection: connection);
      await connection.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await connection.reloadAccess();
      shell.router.go('/tasks');
      await settle(tester);
      expect(shell.session.value.isAuthenticated, isTrue);

      await connection.sessionManager.logout();
      await settle(tester);

      expect(shell.session.value.isAuthenticated, isFalse);
      expect(shell.router.state.uri.path, '/login');
    });
  });

  testWidgets('/step-up sends an anonymous visitor to login', (tester) async {
    final shell = await pumpShell(tester, location: WebShell.stepUpPath);
    expect(shell.router.state.uri.path, '/login');
  });
}

/// Signed-in user of the probe tests.
UserSession probeUser(String id) =>
    UserSession(userId: id, tenantId: 'demo-tenant');

/// Real web registry plus a probe at `/verifier` (not composed by the web
/// shell) that follows the WP0 contract: `screens`, scope data and `AppPage`.
MicrofrontendRegistry registryWithProbe() => buildWebRegistry()
  ..register(
    MicrofrontendManifest(
      id: MicrofrontendId.verifier,
      platforms: {AppPlatform.web},
      access: AccessRule.authenticated(),
      menu: const [],
      screens: [
        ScreenRoute(
          path: '/verifier',
          loadLibrary: () async {},
          builder: (scope, {params = const {}}) =>
              _ProbeScreen(userId: scope.services.session.userId!),
          routes: [
            ScreenRoute(
              path: 'secure',
              access: AccessRule.mfa(const Duration(minutes: 10)),
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) =>
                  const AppPage(title: 'Seguro', body: Text('zona segura')),
            ),
          ],
        ),
      ],
    ),
  );

/// Copies the user id into its state once, like a screen that loads data in
/// `initState`. Only a rebuild from scratch shows another user.
class _ProbeScreen extends StatefulWidget {
  const _ProbeScreen({required this.userId});

  final String userId;

  @override
  State<_ProbeScreen> createState() => _ProbeScreenState();
}

class _ProbeScreenState extends State<_ProbeScreen> {
  late final String _loadedFor = widget.userId;

  @override
  Widget build(BuildContext context) =>
      AppPage(title: 'Sonda', body: Text('usuario $_loadedFor'));
}

const userId = '0193f1c2-0000-7000-8000-0000000000a1';
const challengeId = '0193f1c2-0000-7000-8000-000000000001';

SessionAccess access(List<Permission> permissions) => SessionAccess(
  userId: userId,
  tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
  sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
  permissions: permissions,
  platformRoles: const [],
  features: const [],
  flags: const [],
  mfaVerifiedAt: null,
);

SignInResponse authenticated() => SignInResponse(
  status: SignInStatus.authenticated,
  tokens: SessionTokens(
    accessToken: 'access-1',
    accessExpiresAt: DateTime.now().add(const Duration(hours: 1)),
  ),
);

class _NoNetwork implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) async =>
      const TransportResponse(statusCode: 503);
}
