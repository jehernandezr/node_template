import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/mobile_shell.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:shell_host/shell_host.dart';
import 'package:ui/ui.dart';

const _phoneSize = Size(390, 844);

/// Pumps the shell on a phone in Spanish. Its session starts as [session]
/// and the test writes it through the returned notifier.
Future<ValueNotifier<UserSession>> _pumpShell(
  WidgetTester tester, {
  UserSession? session,
  List<MicrofrontendManifest>? manifests,
  IdentityConnection? connection,
}) async {
  tester.view.physicalSize = _phoneSize * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  tester.platformDispatcher.localeTestValue = const Locale('es');
  tester.platformDispatcher.localesTestValue = const [Locale('es')];
  addTearDown(tester.platformDispatcher.clearLocaleTestValue);

  final host = buildMobileHost(connection: connection, manifests: manifests);
  if (session != null) host.session.value = session;
  await tester.pumpWidget(ShellHostApp(host: host));
  addTearDown(() async {
    // Queued identity syncs run on the fake clock: let them finish before
    // unmounting disposes the host, so no timer is left behind.
    var idle = false;
    host.runtime.whenIdle().then((_) => idle = true);
    for (var i = 0; i < 50 && !idle; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(idle, isTrue, reason: 'the runtime never got idle');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
  await tester.pump();
  return host.session;
}

GoRouter _router(WidgetTester tester) =>
    GoRouter.of(tester.element(find.byType(Navigator).first));

Future<void> _go(WidgetTester tester, String location) async {
  _router(tester).go(location);
  await tester.pump();
  await tester.pump();
}

/// Pumps until nothing is animating: lifecycles have published and the
/// demo data has arrived.
Future<void> _settle(WidgetTester tester) => tester.pumpAndSettle();

String _location(WidgetTester tester) => _router(tester).state.uri.toString();

final UserSession _client = UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
  features: {PlanFeature.aiAssistant},
);

final UserSession _clientNoAssistant = UserSession(
  userId: 'u2',
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

/// Real mobile manifests plus a probe at `/probe` that serves demo and live
/// shells, with screens drawn with [AppPage].
List<MicrofrontendManifest> _manifestsWithProbe() => [
  ...mobileManifests,
  MicrofrontendManifest(
    id: const MicrofrontendId('probe'),
    platforms: {AppPlatform.mobile},
    access: AccessRule.authenticated(),
    menu: const [],
    screens: [
      ScreenRoute(
        path: '/probe',
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
              body: Text('modo: ${scope.services.mode.name}'),
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
];

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
  setUpAll(() => const DeferredLibrariesLoader().load(_manifestsWithProbe()));
  setUp(resetDeferredPageCache);

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

    await tester.tap(find.byKey(const ValueKey('demo-sign-in-customer')));
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
        manifests: _manifestsWithProbe(),
      );
      await _go(tester, '/probe');
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
    await _pumpShell(
      tester,
      session: _client,
      manifests: _manifestsWithProbe(),
    );
    await _go(tester, '/probe');
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
    await tester.tap(find.widgetWithText(AppButton, 'Cerrar sesión'));
    await _settle(tester);

    expect(_location(tester), '/login');
  });

  test('the router of the real manifests lists each route once', () async {
    final host = buildMobileHost();
    addTearDown(host.dispose);

    final paths = _absolutePaths(host.router.configuration.routes).toList();
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
  });

  test('a route outside its microfrontend prefix fails at startup', () {
    expect(
      () => buildMobileHost(
        manifests: [
          MicrofrontendManifest(
            id: const MicrofrontendId('tasks'),
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
        ],
      ),
      throwsStateError,
    );
  });

  test('a new identity gets fresh scopes and the previous scope is '
      'disposed', () async {
    final host = buildMobileHost();
    addTearDown(host.dispose);
    const tasks = MicrofrontendId('tasks');
    host.session.value = _client;

    final before = host.runtime.scopeFor(tasks);
    host.session.value = _clientNoAssistant;
    final after = host.runtime.scopeFor(tasks);

    expect(identical(before, after), isFalse);
    expect(after.services.session.userId, 'u2');
    expect(() => before.get<Object>((_) => Object()), throwsStateError);
  });

  testWidgets('identity switch: a mounted route shows the new user\'s data', (
    tester,
  ) async {
    final session = await _pumpShell(
      tester,
      session: _client,
      manifests: _manifestsWithProbe(),
    );
    await _go(tester, '/probe');
    await _settle(tester);
    expect(find.text('usuario u1'), findsOneWidget);

    session.value = _clientNoAssistant;
    await _settle(tester);

    expect(_location(tester), '/probe');
    expect(find.text('usuario u2'), findsOneWidget);
    expect(find.text('usuario u1'), findsNothing);
  });

  testWidgets(
    'an MFA sub-route sends to /step-up and returns after verifying',
    (tester) async {
      final session = await _pumpShell(
        tester,
        session: _client,
        manifests: _manifestsWithProbe(),
      );
      await _go(tester, '/probe/secure');
      await tester.pump(const Duration(seconds: 1));

      expect(_location(tester), '/step-up?from=%2Fprobe%2Fsecure');
      expect(find.text('Verificación adicional'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('step-up-verify')));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(_location(tester), '/probe/secure');
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
        manifests: _manifestsWithProbe(),
      );
      await _go(tester, '/probe/sensitive');
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
    await _pumpShell(
      tester,
      session: _client,
      manifests: _manifestsWithProbe(),
    );
    await _go(tester, '/probe/sensitive');
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.text('pedir step-up'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Verificación adicional'), findsOneWidget);

    // A tab or a deep link navigates with go, not pop.
    await _go(tester, '/probe/sensitive');
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
        manifests: _manifestsWithProbe(),
        connection: connection,
      );
      await _go(tester, '/probe/api');
      expect(_location(tester), startsWith('/login'));
      expect(find.byKey(const ValueKey('demo-sign-in-customer')), findsNothing);

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
      expect(_location(tester), '/probe/api');
      expect(find.text('modo: live'), findsOneWidget);
    });

    testWidgets('when identity closes the session the shell goes to login', (
      tester,
    ) async {
      prepare();
      final session = await _pumpShell(
        tester,
        manifests: _manifestsWithProbe(),
        connection: connection,
      );
      await connection.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await connection.reloadAccess();
      await _go(tester, '/account');
      expect(session.value.isAuthenticated, isTrue);

      await connection.sessionManager.logout();
      await _settle(tester);

      expect(session.value.isAuthenticated, isFalse);
      expect(_location(tester), '/login');
    });

    testWidgets('an MFA route runs the identity step-up and returns with the '
        'mfaVerifiedAt of the server', (tester) async {
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
        manifests: _manifestsWithProbe(),
        connection: connection,
      );
      await connection.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await connection.reloadAccess();
      await _go(tester, '/probe/secure');
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
      expect(_location(tester), '/probe/secure');
      expect(find.text('zona segura'), findsOneWidget);
    });
  });
}

class _NoNetwork implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) async =>
      const TransportResponse(statusCode: 503);

  @override
  void close() {}
}
