import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart' show BackButton;
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../../auth/fake_auth_repository.dart';
import '../../auth/fake_token_store.dart';
import '../../clock/fake_clock.dart';
import '../../errors/fake_failure.dart';
import '../../http/scripted_transport.dart';
import '../../session/session_builder.dart';
import '../deferred_libraries_preloader.dart';
import 'scenario_identity.dart';
import 'scenario_probe.dart';
import 'shell_fixture.dart';
import 'shell_scenario_setup.dart';

/// Registers the shared scenarios: sign-in that keeps `from`, sign-out,
/// forbidden page, step-up redirect, step-up of an action, MFA at login,
/// identity switch, deep link after restoring the session and the live data
/// of a business microfrontend.
///
/// [platform] names the group, so the two apps tell apart in a report.
void defineShellScenarios(ShellFixture fixture, {String platform = 'shell'}) =>
    ShellScenarioSuite(fixture, platform: platform).define();

/// The scenarios, one method each, over a [ShellFixture].
final class ShellScenarioSuite {
  /// Creates the suite.
  const ShellScenarioSuite(this.fixture, {this.platform = 'shell'});

  /// The app under test.
  final ShellFixture fixture;

  /// Name of the group.
  final String platform;

  /// Pages of the shell, as the shell registers them.
  static const ShellPaths _paths = ShellPaths(stepUp: '/step-up');

  /// Calls `group` and `setUpAll` and registers every scenario.
  void define() {
    group('$platform scenarios', () {
      setUpAll(
        () => const DeferredLibrariesPreloader().load([
          const ScenarioProbe().manifest(),
        ]),
      );
      signInKeepsFrom();
      signOut();
      forbiddenPage();
      stepUpRedirect();
      stepUpOfAnAction();
      mfaAtLogin();
      identitySwitch();
      restoredDeepLink();
      liveBusinessData();
    });
  }

  /// An anonymous visitor goes to sign-in with `from` and comes back to it.
  void signInKeepsFrom() {
    group('sign-in keeps the page asked for', () {
      testWidgets(
        'keeps from through the demo sign-in',
        (tester) => _run(tester, (s) async {
          expect(s.under.currentLocation(), '/login?from=%2Fprobe');
          expect(find.text(_Texts.demoMode), findsOneWidget);

          await tester.tap(find.byKey(_Keys.demoCustomer));
          await tester.pumpAndSettle();

          expect(s.under.currentLocation(), ScenarioProbe.home);
          expect(
            find.text(ScenarioProbe.userText('demo-customer')),
            findsOneWidget,
          );
          expect(find.text(_Texts.demoMode), findsNothing);
        }, initialLocation: ScenarioProbe.home),
      );
    });
  }

  /// Signing out from the forbidden page goes to sign-in without `from`.
  void signOut() {
    group('sign-out', () {
      testWidgets(
        'signing out from the forbidden page goes to sign-in without from',
        (tester) => _run(
          tester,
          (s) async {
            await tester.tap(find.widgetWithText(AppButton, _Texts.signOut));
            await tester.pumpAndSettle();

            expect(s.under.currentLocation(), _paths.login);
            expect(s.under.session.value.isAuthenticated, isFalse);
            expect(find.text(_Texts.demoMode), findsOneWidget);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.restricted,
        ),
      );
    });
  }

  /// A page the session cannot reach shows the forbidden page.
  void forbiddenPage() {
    group('forbidden page', () {
      testWidgets(
        'a page the session cannot reach shows forbidden',
        (tester) => _run(
          tester,
          (s) async {
            expect(s.uri.path, _paths.forbidden);
            expect(s.uri.queryParameters['from'], ScenarioProbe.restricted);
            expect(find.text(_Texts.forbidden), findsOneWidget);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.restricted,
        ),
      );
    });
  }

  /// A page that needs a recent second factor goes through step-up and back.
  void stepUpRedirect() {
    group('step-up redirect', () {
      testWidgets(
        'demo: a stale second factor goes through step-up and back',
        (tester) => _run(
          tester,
          (s) async {
            expect(
              s.under.currentLocation(),
              '/step-up?from=%2Fprobe%2Fsecure',
            );
            expect(find.text(_Texts.stepUpTitle), findsOneWidget);

            await tester.tap(find.byKey(_Keys.stepUpVerify));
            await tester.pumpAndSettle();

            expect(s.under.currentLocation(), ScenarioProbe.secure);
            expect(find.text(ScenarioProbe.secureText), findsOneWidget);
            expect(s.under.session.value.mfaVerifiedAt, isNotNull);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.secure,
        ),
      );

      testWidgets(
        'live: the identity step-up opens the page',
        (tester) => _run(
          tester,
          (s) async {
            final auth = s.auth!;
            await s.signInLive();
            await s.go(ScenarioProbe.secure);

            expect(s.uri.path, _paths.stepUp);
            expect(find.byKey(_Keys.stepUpVerify), findsNothing);

            await s.verifyWithDeviceCode();

            expect(auth.lastStepUpVerify?.mfaToken, _Identity.stepUpToken);
            expect(s.under.session.value.mfaVerifiedAt, s.clock.now());
            expect(s.under.currentLocation(), ScenarioProbe.secure);
            expect(find.text(ScenarioProbe.secureText), findsOneWidget);
          },
          live: true,
          configure: _Configurations.deviceStepUp,
        ),
      );

      testWidgets(
        'the step-up page sends an anonymous visitor to sign-in',
        (tester) => _run(tester, (s) async {
          await s.go(_paths.stepUp!);

          expect(s.uri.path, _paths.login);
        }),
      );
    });
  }

  /// A screen asks for a step-up and gets the answer, demo and live.
  void stepUpOfAnAction() {
    group('step-up of an action', () {
      testWidgets(
        'answers true after verifying and keeps the page',
        (tester) => _run(
          tester,
          (s) async {
            await _askAndSeeStepUp(tester);

            await tester.tap(find.byKey(_Keys.stepUpVerify));
            await tester.pumpAndSettle();

            expect(
              find.text(ScenarioProbe.stepUpText(verified: true)),
              findsOneWidget,
            );
            expect(find.text(_Texts.stepUpTitle), findsNothing);
            expect(s.under.currentLocation(), ScenarioProbe.sensitive);
            expect(s.under.session.value.mfaVerifiedAt, isNotNull);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.sensitive,
        ),
      );

      testWidgets(
        'answers false when a go replaces the page',
        (tester) => _run(
          tester,
          (s) async {
            await _askAndSeeStepUp(tester);

            await s.go(ScenarioProbe.sensitive);

            expect(find.text(_Texts.stepUpTitle), findsNothing);
            expect(
              find.text(ScenarioProbe.stepUpText(verified: false)),
              findsOneWidget,
            );
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.sensitive,
        ),
      );

      testWidgets(
        'answers false when the user goes back',
        (tester) => _run(
          tester,
          (s) async {
            await _askAndSeeStepUp(tester);

            await tester.tap(find.byType(BackButton));
            await tester.pumpAndSettle();

            expect(
              find.text(ScenarioProbe.stepUpText(verified: false)),
              findsOneWidget,
            );
            expect(s.under.session.value.mfaVerifiedAt, isNull);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.sensitive,
        ),
      );

      testWidgets(
        'live: runs the identity step-up and takes the server mfaVerifiedAt',
        (tester) => _run(
          tester,
          (s) async {
            final auth = s.auth!;
            await s.signInLive();
            await s.go(ScenarioProbe.sensitive);

            expect(find.text(ScenarioProbe.notAsked), findsOneWidget);
            await tester.tap(find.text(ScenarioProbe.askStepUp));
            await tester.pumpAndSettle();

            expect(auth.startStepUpCount, 1);
            expect(find.byKey(_Keys.stepUpVerify), findsNothing);

            await s.verifyWithDeviceCode();

            expect(
              find.text(ScenarioProbe.stepUpText(verified: true)),
              findsOneWidget,
            );
            expect(
              auth.lastStepUpChallengeRequest?.mfaToken,
              _Identity.stepUpToken,
            );
            expect(auth.lastStepUpVerify?.code, _Identity.deviceCode);
            expect(s.connection!.access.value?.mfaVerifiedAt, s.clock.now());
            expect(s.under.session.value.mfaVerifiedAt, s.clock.now());
            expect(
              await s.connection!.sessionManager.accessToken(),
              _Identity.mfaAccessToken,
            );
          },
          live: true,
          configure: _Configurations.deviceStepUp,
        ),
      );

      testWidgets(
        'live: a method the step-up does not offer goes back to the methods',
        (tester) => _run(
          tester,
          (s) async {
            await s.signInLive();
            await s.go(ScenarioProbe.sensitive);

            await tester.tap(find.text(ScenarioProbe.askStepUp));
            await tester.pumpAndSettle();
            await tester.tap(find.text(_Texts.emailMethod));
            await tester.pumpAndSettle();

            expect(find.text(_Texts.methodUnavailable), findsOneWidget);
            expect(find.text(_Texts.emailMethod), findsOneWidget);
            expect(s.under.session.value.mfaVerifiedAt, isNull);
          },
          live: true,
          configure: _Configurations.emailOnlyStepUp,
        ),
      );
    });
  }

  /// The sign-in page runs the second factor and the session comes from
  /// identity.
  void mfaAtLogin() {
    group('MFA at login', () {
      testWidgets(
        'the sign-in page runs the second factor and the session comes from identity',
        (tester) => _run(
          tester,
          (s) async {
            final auth = s.auth!;
            expect(s.uri.path, _paths.login);
            expect(find.byKey(_Keys.demoCustomer), findsNothing);

            await tester.enterText(
              find.byKey(_Keys.signInEmail),
              _Identity.email,
            );
            await tester.enterText(
              find.byKey(_Keys.signInPassword),
              _Identity.password,
            );
            await tester.tap(find.text(_Texts.signIn).last);
            await tester.pumpAndSettle();
            await tester.tap(find.text(_Texts.emailMethod));
            await tester.pumpAndSettle();
            await tester.enterText(
              find.byKey(_Keys.signInCode),
              _Identity.emailCode,
            );
            await tester.tap(find.text(_Texts.verify));
            await tester.pumpAndSettle();

            expect(auth.lastChallengeRequest?.method, MfaFactor.emailOtp);
            expect(auth.lastVerify?.challengeId, _Identity.challengeId);
            expect(
              s.under.session.value.userId,
              ScenarioIdentity.defaultUserId,
            );
            expect(s.under.session.value.permissions, {Permission.tasksRead});
            expect(s.under.currentLocation(), ScenarioProbe.api);
            expect(
              find.text(ScenarioProbe.modeText(ShellMode.live)),
              findsOneWidget,
            );
            expect(
              find.text(ScenarioProbe.clientText(s.connection!.apiClient)),
              findsOneWidget,
            );
          },
          live: true,
          configure: _Configurations.mfaAtLogin,
          initialLocation: ScenarioProbe.api,
        ),
      );

      testWidgets(
        'a wrong password shows the contract message',
        (tester) => _run(tester, (s) async {
          await tester.enterText(
            find.byKey(_Keys.signInEmail),
            _Identity.email,
          );
          await tester.enterText(
            find.byKey(_Keys.signInPassword),
            _Identity.wrongPassword,
          );
          await tester.tap(find.text(_Texts.signIn).last);
          await tester.pumpAndSettle();

          expect(find.text(_Texts.wrongPassword), findsOneWidget);
        }, live: true),
      );
    });
  }

  /// A new identity rebuilds the mounted page and drops the previous
  /// messages.
  void identitySwitch() {
    group('identity switch', () {
      testWidgets(
        'a mounted page shows the new user data',
        (tester) => _run(
          tester,
          (s) async {
            expect(find.text(ScenarioProbe.userText('u1')), findsOneWidget);

            s.under.session.value = _Identity.demoUser('u2');
            await tester.pumpAndSettle();

            expect(s.under.currentLocation(), ScenarioProbe.home);
            expect(find.text(ScenarioProbe.userText('u2')), findsOneWidget);
            expect(find.text(ScenarioProbe.userText('u1')), findsNothing);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.home,
        ),
      );

      testWidgets(
        'the previous user messages are cleared',
        (tester) => _run(
          tester,
          (s) async {
            showActionError(
              tester.element(find.text(ScenarioProbe.userText('u1'))),
              const FakeFailure(),
              message: _Texts.u1Error,
            );
            await tester.pump();
            expect(find.text(_Texts.u1Error), findsWidgets);

            s.under.session.value = _Identity.demoUser('u2');
            await tester.pumpAndSettle();

            expect(find.text(_Texts.u1Error), findsNothing);
          },
          session: _Identity.demoUser('u1'),
          initialLocation: ScenarioProbe.home,
        ),
      );
    });
  }

  /// A stored session opens the deep link, and a closed one goes to sign-in.
  void restoredDeepLink() {
    group('restored deep link', () {
      testWidgets(
        'a stored session opens the deep link',
        (tester) => _run(
          tester,
          (s) async {
            await tester.pump(const Duration(seconds: 1));
            await tester.pump(const Duration(seconds: 1));

            expect(s.under.session.value.isAuthenticated, isTrue);
            expect(
              s.under.session.value.userId,
              ScenarioIdentity.defaultUserId,
            );
            expect(s.under.currentLocation(), ScenarioProbe.api);
            expect(
              find.text(ScenarioProbe.modeText(ShellMode.live)),
              findsOneWidget,
            );
            expect(s.auth!.refreshCount, 1);
            expect(s.auth!.lastRefreshSessionToken, _Identity.sessionToken);
          },
          live: true,
          tokenStore: FakeTokenStore(_Identity.sessionToken),
          configure: _Configurations.refresh,
          initialLocation: ScenarioProbe.api,
        ),
      );

      testWidgets(
        'when identity closes the session the user goes to sign-in',
        (tester) => _run(
          tester,
          (s) async {
            await s.signInLive();
            await s.go('/');

            expect(s.under.session.value.isAuthenticated, isTrue);

            await s.connection!.sessionManager.logout();
            await tester.pumpAndSettle();

            expect(s.under.session.value.isAuthenticated, isFalse);
            expect(s.uri.path, _paths.login);
          },
          live: true,
          configure: _Configurations.signIn,
        ),
      );
    });
  }

  /// Builds the fixture, runs [body] inside the test and closes the app
  /// inside the test body too.
  /// In live mode a business microfrontend reads its API with the session
  /// token and follows the tenant to its region. Both apps compose tasks.
  void liveBusinessData() {
    group('live business data', () {
      testWidgets('the tasks come from the API of the region of the tenant', (
        tester,
      ) {
        final api = ScriptedTransport.unavailable()
          ..problem(_Api.wrongRegion, path: _Api.tasksRoute)
          ..json(200, _Api.taskPage, path: _Api.tasksRoute);
        return _run(
          tester,
          (s) async {
            await s.signInLive();
            await s.go(_Api.tasksPage);

            final reads = api.requestsTo(_Api.tasksRoute);
            expect(reads.map((request) => request.uri.host), [
              'api.example.com',
              Uri.parse(_Api.regionBase).host,
            ]);
            expect(
              reads.last.headers['authorization'],
              'Bearer ${_Identity.accessToken}',
            );
            expect(find.text(_Api.taskTitle), findsWidgets);
          },
          live: true,
          api: api,
          configure: _Configurations.signIn,
        );
      });
    });
  }

  Future<void> _run(
    WidgetTester tester,
    Future<void> Function(_Scenario s) body, {
    UserSession? session,
    bool live = false,
    TokenStore? tokenStore,
    void Function(FakeAuthRepository auth, FakeClock clock)? configure,
    String initialLocation = '/',
    ScriptedTransport? api,
  }) async {
    final clock = FakeClock();
    FakeAuthRepository? auth;
    IdentityConnection? connection;
    if (live) {
      auth = FakeAuthRepository();
      configure?.call(auth, clock);
      connection = const ScenarioIdentity().build(
        auth,
        tokenStore: tokenStore,
        clock: clock.now,
        api: api,
      );
    }
    final under = await fixture.pump(
      tester,
      ShellScenarioSetup(
        manifests: [const ScenarioProbe().manifest()],
        clock: clock,
        session: session,
        connection: connection,
        auth: auth,
        initialLocation: initialLocation,
      ),
    );
    try {
      await body(
        _Scenario(
          tester: tester,
          under: under,
          clock: clock,
          auth: auth,
          connection: connection,
        ),
      );
    } finally {
      await under.close();
    }
  }

  /// Asks for a step-up from the sensitive page and waits for the step-up
  /// page to show.
  Future<void> _askAndSeeStepUp(WidgetTester tester) async {
    expect(find.text(ScenarioProbe.notAsked), findsOneWidget);
    await tester.tap(find.text(ScenarioProbe.askStepUp));
    await tester.pumpAndSettle();
    expect(find.text(_Texts.stepUpTitle), findsOneWidget);
  }
}

/// How each live scenario answers through the [FakeAuthRepository].
abstract final class _Configurations {
  static void signIn(FakeAuthRepository auth, FakeClock clock) {
    auth.signInResult = _Identity.authenticated(clock);
  }

  static void deviceStepUp(FakeAuthRepository auth, FakeClock clock) {
    auth
      ..signInResult = _Identity.authenticated(clock)
      ..stepUpResult = const PendingMfa(
        mfaToken: _Identity.stepUpToken,
        methods: [MfaFactor.deviceOtp],
      )
      ..stepUpChallengeResult = MfaChallenge(
        challengeId: _Identity.challengeId,
        method: MfaFactor.deviceOtp,
        expiresAt: clock.now().add(const Duration(minutes: 3)),
        codeLength: MfaRules.deviceCodeLength,
      )
      ..stepUpVerifyResult = StepUpResult(
        tokens: _Identity.tokens(clock, _Identity.mfaAccessToken),
        mfaVerifiedAt: clock.now(),
      );
  }

  static void emailOnlyStepUp(FakeAuthRepository auth, FakeClock clock) {
    auth
      ..signInResult = _Identity.authenticated(clock)
      ..stepUpResult = const PendingMfa(
        mfaToken: _Identity.stepUpToken,
        methods: [MfaFactor.emailOtp],
      );
  }

  static void mfaAtLogin(FakeAuthRepository auth, FakeClock clock) {
    auth
      ..signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: PendingMfa(mfaToken: 'mfa-1', methods: [MfaFactor.emailOtp]),
      )
      ..challengeResult = MfaChallenge(
        challengeId: _Identity.challengeId,
        method: MfaFactor.emailOtp,
        expiresAt: clock.now().add(const Duration(minutes: 5)),
        codeLength: MfaRules.emailCodeLength,
      )
      ..verifyResult = _Identity.authenticated(clock);
  }

  static void refresh(FakeAuthRepository auth, FakeClock clock) {
    auth.refreshResult = _Identity.tokens(
      clock,
      _Identity.accessToken,
      sessionToken: _Identity.sessionToken,
    );
  }
}

/// What a scenario sees and drives: the pumped app, its clock, and the fakes
/// behind the live connection when there is one.
final class _Scenario {
  const _Scenario({
    required this.tester,
    required this.under,
    required this.clock,
    this.auth,
    this.connection,
  });

  final WidgetTester tester;
  final ShellUnderTest under;
  final FakeClock clock;
  final FakeAuthRepository? auth;
  final IdentityConnection? connection;

  /// Navigates with `go` and waits for the page to settle.
  Future<void> go(String location) async {
    under.router.go(location);
    await tester.pumpAndSettle();
  }

  /// Location the router is on, without the query.
  Uri get uri => under.router.state.uri;

  /// Signs in through the connection and loads its access, as the sign-in
  /// page does.
  Future<void> signInLive() async {
    await connection!.sessionManager.signIn(
      const SignInRequest(email: _Identity.email, password: _Identity.password),
    );
    await connection!.reloadAccess();
    await tester.pumpAndSettle();
  }

  /// Picks the device code on the step-up page and submits it.
  Future<void> verifyWithDeviceCode() async {
    await tester.tap(find.text(_Texts.deviceMethod));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(_Keys.stepUpCode), _Identity.deviceCode);
    await tester.tap(find.text(_Texts.verify));
    await tester.pumpAndSettle();
  }
}

/// What the API answers in the live data scenario.
abstract final class _Api {
  /// Page of the tasks microfrontend, which both apps compose.
  static const String tasksPage = '/tasks';
  static final String tasksRoute = TasksRoutes.listTasks.path;
  static const String regionBase = 'https://sa.api.example.test';
  static const String taskTitle = 'Revisar contrato del proveedor';

  static final ProblemDetails wrongRegion = ProblemDetails(
    type: 'about:blank',
    title: 'Wrong region',
    status: PlatformErrorCode.shardingWrongRegion.httpStatus,
    code: PlatformErrorCode.shardingWrongRegion.code,
    details: const ProblemDetailsDetails(
      region: 'sa-east-1',
      apiBaseUrl: regionBase,
    ),
  );

  static const Map<String, Object?> taskPage = {
    'items': [
      {
        'id': '0193f1c2-0000-7000-8000-0000000000e1',
        'title': taskTitle,
        'description': '',
        'status': 'open',
        'version': 1,
        'createdAt': '2026-11-20T10:00:00.000Z',
        'updatedAt': '2026-11-20T10:00:00.000Z',
        'createdBy': {
          'userId': ScenarioIdentity.defaultUserId,
          'homeTenantId': '0193f1c2-0000-7000-8000-0000000000b1',
        },
      },
    ],
    'nextCursor': null,
  };
}

/// Texts the scenarios look for on screen, in Spanish.
abstract final class _Texts {
  static const String demoMode = 'Modo demostración';
  static const String stepUpTitle = 'Verificación adicional';
  static const String forbidden = 'Acceso denegado';
  static const String signOut = 'Cerrar sesión';
  static const String signIn = 'Iniciar sesión';
  static const String verify = 'Verificar';
  static const String emailMethod = 'Código por email';
  static const String deviceMethod = 'Código en tu dispositivo de confianza';
  static const String wrongPassword =
      'El email o la contraseña no son correctos.';
  static const String methodUnavailable =
      'Ese método de verificación no está disponible. Elige otro.';

  /// Message the identity switch scenario shows for the first user.
  static const String u1Error = 'Error de u1';
}

/// Keys of the widgets the scenarios tap or fill.
abstract final class _Keys {
  static const demoCustomer = ValueKey('demo-sign-in-customer');
  static const stepUpVerify = ValueKey('step-up-verify');
  static const stepUpCode = ValueKey('step-up-code');
  static const signInEmail = ValueKey('sign-in-email');
  static const signInPassword = ValueKey('sign-in-password');
  static const signInCode = ValueKey('sign-in-code');
}

/// Identity values the live scenarios use: the sign-in, the challenges and
/// the tokens they answer with.
abstract final class _Identity {
  static const String email = 'ana@example.com';
  static const String password = 'secret';
  static const String wrongPassword = 'wrong';
  static const String challengeId = '0193f1c2-0000-7000-8000-000000000001';
  static const String deviceCode = '12345678';
  static const String emailCode = '123456';
  static const String sessionToken = 'session-1';
  static const String accessToken = 'access-1';
  static const String mfaAccessToken = 'access-mfa';
  static const String stepUpToken = 'step-1';

  static SessionTokens tokens(
    FakeClock clock,
    String accessToken, {
    String? sessionToken,
  }) => SessionTokens(
    accessToken: accessToken,
    accessExpiresAt: clock.now().add(const Duration(hours: 1)),
    sessionToken: sessionToken,
  );

  static SignInResponse authenticated(FakeClock clock) => SignInResponse(
    status: SignInStatus.authenticated,
    tokens: tokens(clock, accessToken),
  );

  /// Demo session of [id] with the tasks permission.
  static UserSession demoUser(String id) =>
      SessionBuilder(userId: id)
          .withPermissions(const [Permission.tasksRead])
          .build();
}
