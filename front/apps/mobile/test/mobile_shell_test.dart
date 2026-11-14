import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/app.dart';
import 'package:mobile_shell/src/login/login_page.dart';
import 'package:mobile_shell/src/registry.dart';
import 'package:mobile_shell/src/router.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

const _phoneSize = Size(390, 844);

Future<ValueNotifier<UserSession>> _pumpShell(
  WidgetTester tester, {
  UserSession? session,
  MicrofrontendRegistry? registry,
  IdentityConnection? connection,
}) async {
  tester.view.physicalSize = _phoneSize * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  tester.platformDispatcher.localeTestValue = const Locale('es');
  tester.platformDispatcher.localesTestValue = const [Locale('es')];
  addTearDown(tester.platformDispatcher.clearLocaleTestValue);

  final notifier = ValueNotifier<UserSession>(
    session ?? UserSession.anonymous(),
  );
  await tester.pumpWidget(
    MobileShellApp(
      registry: registry ?? buildMobileRegistry(),
      session: notifier,
      connection: connection,
    ),
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

String _location(WidgetTester tester) => _router(tester).state.uri.toString();

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

/// Real mobile registry plus a probe screen at `/billing` that uses [AppPage],
/// as every screen does after the WP0 migration.
MicrofrontendRegistry _registryWithProbe() => buildMobileRegistry()
  ..register(
    MicrofrontendManifest(
      id: MicrofrontendId.billing,
      platforms: {AppPlatform.mobile},
      access: AccessRule.authenticated(),
      menu: const [],
      screens: [
        ScreenRoute(
          path: '/billing',
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
            ScreenRoute(
              path: 'api',
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) => AppPage(
                title: 'Api',
                body: Text('api: ${scope.services.extra<ApiClient>() != null}'),
              ),
            ),
            ScreenRoute(
              path: 'sensitive',
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) =>
                  _StepUpProbe(requestStepUp: scope.services.requestStepUp),
            ),
          ],
        ),
      ],
    ),
  );

/// Asks the shell for a step-up, as a sensitive action does, and shows the
/// answer.
class _StepUpProbe extends StatefulWidget {
  const _StepUpProbe({required this.requestStepUp});

  final Future<bool> Function() requestStepUp;

  @override
  State<_StepUpProbe> createState() => _StepUpProbeState();
}

class _StepUpProbeState extends State<_StepUpProbe> {
  String _result = 'sin pedir';

  Future<void> _ask() async {
    final verified = await widget.requestStepUp();
    if (mounted) setState(() => _result = 'step-up: $verified');
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: 'Acción sensible',
    body: Column(
      children: [
        Text(_result),
        TextButton(onPressed: _ask, child: const Text('pedir step-up')),
      ],
    ),
  );
}

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
      AppPage(title: 'Probe', body: Text('usuario $_loadedFor'));
}

/// Runtime over [registry] that follows [session], with its own event bus.
ShellRuntime _runtimeFor(
  MicrofrontendRegistry registry,
  ValueNotifier<UserSession> session,
) {
  late final ShellRuntime runtime;
  runtime = ShellRuntime(
    registry: registry,
    platform: AppPlatform.mobile,
    session: session,
    servicesFactory: (identity) => DefaultShellServices(session: identity),
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
  stepUp: StepUpRequests(path: stepUpPath),
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
  testWidgets('anonymous visitor on a protected page goes to login with from', (
    tester,
  ) async {
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

  testWidgets(
    'assistant tab is hidden for a client without the assistant plan',
    (tester) async {
      await _pumpShell(tester, session: _clientNoAssistant);
      await tester.pump();

      expect(find.text('Asistente'), findsNothing);
      expect(find.text('Verificador'), findsOneWidget);
      expect(find.text('Tareas'), findsOneWidget);
    },
  );

  testWidgets(
    'a session without the plan is sent to forbidden from the assistant route',
    (tester) async {
      await _pumpShell(tester, session: _clientNoAssistant);
      await _go(tester, '/assistant');

      expect(_location(tester), '/forbidden?from=%2Fassistant');
    },
  );

  testWidgets('menu labels are in Spanish', (tester) async {
    await _pumpShell(tester, session: _client);
    await tester.pump();

    for (final label in [
      'Cuenta',
      'Tareas',
      'Notificaciones',
      'Asistente',
      'Verificador',
    ]) {
      expect(find.text(label), findsOneWidget, reason: label);
    }
  });

  testWidgets(
    'on compact widths the screen owns the only top bar and shows sign-out',
    (tester) async {
      await _pumpShell(
        tester,
        session: _client,
        registry: _registryWithProbe(),
      );
      await _go(tester, '/billing');
      // Let the page transition finish so the top bar is on screen.
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('Probe'), findsOneWidget);
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

  testWidgets(
    'the shell no longer draws its own compact bar over legacy screens',
    (tester) async {
      await _pumpShell(tester, session: _client);
      await _go(tester, '/tasks');

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

  testWidgets('notifications entry shows the unread badge on mobile', (
    tester,
  ) async {
    await _pumpShell(tester, session: _client);
    await _settle(tester);

    expect(find.byType(Badge), findsOneWidget);
  });

  testWidgets('sign-out goes to login without from', (tester) async {
    await _pumpShell(tester, session: _client, registry: _registryWithProbe());
    await _go(tester, '/billing');
    // Let the page transition finish so the top bar is on screen.
    await tester.pump(const Duration(seconds: 1));

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
    expect(
      paths.toSet(),
      hasLength(paths.length),
      reason: 'duplicated: $paths',
    );
    expect(
      paths,
      containsAll([
        '/login',
        '/forbidden',
        '/tasks',
        '/notifications',
        '/verifier',
      ]),
    );

    router.dispose();
    runtime.dispose();
    session.dispose();
  });

  test(
    'a route outside its microfrontend prefix fails router construction',
    () {
      final session = ValueNotifier<UserSession>(UserSession.anonymous());
      final registry = MicrofrontendRegistry()
        ..register(
          MicrofrontendManifest(
            id: MicrofrontendId.tasks,
            platforms: {AppPlatform.mobile},
            access: AccessRule.public(),
            menu: const [],
            screens: [
              ScreenRoute(
                path: '/billing',
                loadLibrary: () async {},
                builder: (scope, {params = const {}}) =>
                    const SizedBox.shrink(),
              ),
            ],
          ),
        );
      final runtime = _runtimeFor(registry, session);

      expect(() => _routerFor(registry, runtime, session), throwsStateError);

      runtime.dispose();
      session.dispose();
    },
  );

  test(
    'a new identity gets fresh scopes and the previous scope is disposed',
    () {
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
    },
  );

  testWidgets('identity switch: a mounted route shows the new user\'s data', (
    tester,
  ) async {
    final session = await _pumpShell(
      tester,
      session: _client,
      registry: _registryWithProbe(),
    );
    await _go(tester, '/billing');
    await _settle(tester);
    expect(find.text('usuario u1'), findsOneWidget);

    session.value = _clientNoAssistant;
    await _settle(tester);

    expect(_location(tester), '/billing');
    expect(find.text('usuario u2'), findsOneWidget);
    expect(find.text('usuario u1'), findsNothing);
  });

  testWidgets(
    'an MFA sub-route sends to /step-up and returns after verifying',
    (tester) async {
      final session = await _pumpShell(
        tester,
        session: _client,
        registry: _registryWithProbe(),
      );
      await _go(tester, '/billing/secure');
      await tester.pump(const Duration(seconds: 1));

      expect(_location(tester), '/step-up?from=%2Fbilling%2Fsecure');
      expect(find.text('Verificación adicional'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('step-up-verify')));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(_location(tester), '/billing/secure');
      expect(find.text('zona segura'), findsOneWidget);
      expect(session.value.mfaVerifiedAt, isNotNull);
    },
  );

  testWidgets(
    'requestStepUp of the services pushes /step-up and returns the answer',
    (tester) async {
      final session = await _pumpShell(
        tester,
        session: _client,
        registry: _registryWithProbe(),
      );
      await _go(tester, '/billing/sensitive');
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('sin pedir'), findsOneWidget);

      await tester.tap(find.text('pedir step-up'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Verificación adicional'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('step-up-verify')));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('step-up: true'), findsOneWidget);
      expect(find.text('Verificación adicional'), findsNothing);
      expect(session.value.mfaVerifiedAt, isNotNull);
    },
  );

  testWidgets('requestStepUp answers false when a go replaces the page', (
    tester,
  ) async {
    await _pumpShell(tester, session: _client, registry: _registryWithProbe());
    await _go(tester, '/billing/sensitive');
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.text('pedir step-up'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Verificación adicional'), findsOneWidget);

    // A tab or a deep link navigates with go, not pop.
    await _go(tester, '/billing/sensitive');
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Verificación adicional'), findsNothing);
    expect(find.text('step-up: false'), findsOneWidget);
  });

  group('with a real identity connection', () {
    late FakeAuthRepository repository;
    late IdentityConnection connection;

    // Built inside each test: futures created in setUp live outside the
    // fake async zone of testWidgets and never complete there.
    void prepare() {
      repository = FakeAuthRepository()
        ..signInResult = SignInResponse(
          status: SignInStatus.authenticated,
          tokens: SessionTokens(
            accessToken: 'access-1',
            accessExpiresAt: DateTime.now().add(const Duration(hours: 1)),
            sessionToken: 'session-1',
          ),
        );
      final manager = SessionManager(
        repository: repository,
        tokenStore: InMemoryTokenStore(),
      );
      connection = IdentityConnection.withParts(
        sessionManager: manager,
        apiClient: ApiClient(
          transport: _NoNetwork(),
          baseUri: Uri.parse('https://api.example.com'),
          accessToken: manager.accessToken,
        ),
        loadAccess: () async => SessionAccess(
          userId: '0193f1c2-0000-7000-8000-0000000000a1',
          tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
          sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
          permissions: const [Permission.tasksRead],
          platformRoles: const [],
          features: const [],
          flags: const [],
          mfaVerifiedAt: null,
        ),
      );
    }

    testWidgets('signing in loads the session from identity and gives the '
        'microfrontends the ApiClient', (tester) async {
      prepare();
      final session = await _pumpShell(
        tester,
        registry: _registryWithProbe(),
        connection: connection,
      );
      await _go(tester, '/billing/api');
      expect(_location(tester), startsWith('/login'));
      expect(find.byKey(const ValueKey('demo-sign-in-client')), findsNothing);

      await tester.enterText(
        find.byKey(const ValueKey('sign-in-email')),
        'ana@example.com',
      );
      await tester.enterText(
        find.byKey(const ValueKey('sign-in-password')),
        'secret',
      );
      await tester.tap(find.text('Iniciar sesión').last);
      await _settle(tester);
      await tester.pump(const Duration(seconds: 1));

      expect(session.value.userId, '0193f1c2-0000-7000-8000-0000000000a1');
      expect(session.value.permissions, {Permission.tasksRead});
      expect(_location(tester), '/billing/api');
      expect(find.text('api: true'), findsOneWidget);
    });

    testWidgets('when identity closes the session the shell goes to login', (
      tester,
    ) async {
      prepare();
      final session = await _pumpShell(tester, connection: connection);
      await connection.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await connection.reloadAccess();
      await _go(tester, '/tasks');
      expect(session.value.isAuthenticated, isTrue);

      await connection.sessionManager.logout();
      await _settle(tester);

      expect(session.value.isAuthenticated, isFalse);
      expect(_location(tester), '/login');
    });

    testWidgets('an MFA route runs the identity step-up and returns with the '
        'mfaVerifiedAt of the server', (tester) async {
      // flutter_test draws text with the Ahem font (one em per glyph), so the
      // long Spanish method label overflows its button here. Real fonts fit.
      // Only that overflow is ignored.
      final previous = FlutterError.onError;
      FlutterError.onError = (details) {
        if (details.exceptionAsString().contains('RenderFlex overflowed')) {
          return;
        }
        previous?.call(details);
      };
      addTearDown(() => FlutterError.onError = previous);
      prepare();
      final verifiedAt = DateTime.now().toUtc();
      repository
        ..stepUpResult = const PendingMfa(
          mfaToken: 'step-1',
          methods: [MfaFactor.deviceOtp],
        )
        ..stepUpChallengeResult = MfaChallenge(
          challengeId: '0193f1c2-0000-7000-8000-000000000001',
          method: MfaFactor.deviceOtp,
          expiresAt: DateTime.now().add(const Duration(minutes: 3)),
          codeLength: MfaRules.deviceCodeLength,
        )
        ..stepUpVerifyResult = StepUpResult(
          tokens: SessionTokens(
            accessToken: 'access-mfa',
            accessExpiresAt: DateTime.now().add(const Duration(hours: 1)),
          ),
          mfaVerifiedAt: verifiedAt,
        );
      final session = await _pumpShell(
        tester,
        registry: _registryWithProbe(),
        connection: connection,
      );
      await connection.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await connection.reloadAccess();
      await _go(tester, '/billing/secure');
      await _settle(tester);
      await tester.pump(const Duration(seconds: 1));
      expect(_location(tester), startsWith('/step-up'));
      expect(find.byKey(const ValueKey('step-up-verify')), findsNothing);

      await tester.tap(find.text('Código en tu dispositivo de confianza'));
      await _settle(tester);
      await tester.pump(const Duration(seconds: 1));
      await tester.enterText(
        find.byKey(const ValueKey('step-up-code')),
        '12345678',
      );
      await tester.tap(find.text('Verificar'));
      await _settle(tester);
      await tester.pump(const Duration(seconds: 1));

      expect(repository.lastStepUpVerify?.mfaToken, 'step-1');
      expect(session.value.mfaVerifiedAt, verifiedAt);
      expect(await connection.sessionManager.accessToken(), 'access-mfa');
      expect(_location(tester), '/billing/secure');
      expect(find.text('zona segura'), findsOneWidget);
    });
  });

  test('safeReturnLocation rejects external targets', () {
    expect(safeReturnLocation(null), '/');
    expect(safeReturnLocation('/tasks/t1'), '/tasks/t1');
    expect(safeReturnLocation('https://evil.test/x'), '/');
    expect(safeReturnLocation('//evil.test/x'), '/');
    expect(safeReturnLocation(r'/\evil.test'), '/');
  });
}

class _NoNetwork implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) async =>
      const TransportResponse(statusCode: 503);
}
