import 'dart:async';
import 'dart:convert';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

final t0 = DateTime.utc(2026, 11, 13, 12);

SessionAccess _access(List<Permission> permissions) => SessionAccess(
  userId: '0193f1c2-0000-7000-8000-0000000000a1',
  tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
  sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
  permissions: permissions,
  platformRoles: const [],
  features: const [PlanFeature.billing],
  flags: const [],
  mfaVerifiedAt: t0,
);

SignInResponse _authenticated(String access, {DateTime? expiresAt}) =>
    SignInResponse(
      status: SignInStatus.authenticated,
      tokens: SessionTokens(
        accessToken: access,
        accessExpiresAt: expiresAt ?? t0.add(const Duration(minutes: 15)),
        sessionToken: 'session-$access',
      ),
    );

class _Transport implements HttpTransport {
  final List<TransportRequest> requests = [];
  TransportResponse Function(TransportRequest request)? answer;

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    requests.add(request);
    return answer!(request);
  }
}

void main() {
  late FakeAuthRepository repo;
  late SessionManager manager;
  late IdentityConnection connection;
  late List<SessionAccess> served;
  late int loads;

  setUp(() {
    repo = FakeAuthRepository();
    manager = SessionManager(
      repository: repo,
      tokenStore: InMemoryTokenStore(),
      clock: () => t0,
    );
    served = [
      _access([Permission.billingRead]),
    ];
    loads = 0;
    connection = IdentityConnection.withParts(
      sessionManager: manager,
      apiClient: ApiClient(
        transport: _Transport(),
        baseUri: Uri.parse('https://api.example.com'),
      ),
      loadAccess: () async => served[loads++ % served.length],
    );
  });

  tearDown(() => connection.dispose());

  test('access is null until a sign-in loads it', () async {
    expect(connection.access.value, isNull);

    repo.signInResult = _authenticated('a1');
    await manager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );
    await connection.reloadAccess();

    expect(connection.access.value?.permissions, [Permission.billingRead]);
    expect(connection.access.value?.mfaVerifiedAt, t0);
  });

  test('a refresh reloads the access with the new permissions', () async {
    repo.signInResult = _authenticated('a1');
    await manager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );
    await connection.reloadAccess();
    served.add(_access([Permission.billingRead, Permission.billingWrite]));
    repo.refreshResult = _authenticated('a2').tokens;

    await manager.refresh();
    await pumpEventQueue();

    expect(connection.access.value?.permissions, [
      Permission.billingRead,
      Permission.billingWrite,
    ]);
  });

  test('signing out clears the access and drops a late load', () async {
    repo.signInResult = _authenticated('a1');
    await manager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );
    await connection.reloadAccess();

    final gate = Completer<void>();
    final slow = IdentityConnection.withParts(
      sessionManager: manager,
      apiClient: connection.apiClient,
      loadAccess: () async {
        await gate.future;
        return _access([Permission.tasksRead]);
      },
    );
    final loading = slow.reloadAccess();
    await connection.signOut();
    gate.complete();
    await loading;
    await pumpEventQueue();

    expect(connection.access.value, isNull);
    expect(slow.access.value, isNull);
    await slow.dispose();
  });

  test('markMfaVerified publishes the new last MFA in the access', () async {
    repo.signInResult = _authenticated('a1');
    await manager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );
    await connection.reloadAccess();
    final at = t0.add(const Duration(minutes: 30));

    connection.markMfaVerified(at);

    expect(connection.access.value?.mfaVerifiedAt, at);
    expect(connection.access.value?.permissions, [Permission.billingRead]);
  });

  test('markMfaVerified without a session does nothing', () {
    connection.markMfaVerified(t0);
    expect(connection.access.value, isNull);
  });

  test('restore without a stored session leaves the access empty', () async {
    expect(await connection.restore(), isFalse);
    expect(loads, 0);
    expect(connection.access.value, isNull);
  });

  test('the real connection signs API calls with the session token and '
      'loads GET /v1/me/access', () async {
    final transport = _Transport()
      ..answer = (request) => switch (request.uri.path) {
        '/v1/auth/sign-in' => TransportResponse(
          statusCode: 200,
          // The real connection uses the wall clock.
          body: jsonEncode(
            _authenticated(
              'real-token',
              expiresAt: DateTime.now().add(const Duration(hours: 1)),
            ).toJson(),
          ),
        ),
        '/v1/me/access' => TransportResponse(
          statusCode: 200,
          body: jsonEncode(_access([Permission.tasksRead]).toJson()),
        ),
        _ => const TransportResponse(statusCode: 404),
      };
    final real = IdentityConnection(
      transport: transport,
      baseUri: Uri.parse('https://api.example.com'),
      tokenStore: InMemoryTokenStore(),
    );
    addTearDown(real.dispose);

    await real.sessionManager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );
    await real.reloadAccess();

    expect(real.access.value?.permissions, [Permission.tasksRead]);
    final accessRequest = transport.requests.last;
    expect(accessRequest.method, 'GET');
    expect(accessRequest.headers['authorization'], 'Bearer real-token');
    expect(
      transport.requests.first.headers.containsKey('authorization'),
      isFalse,
    );
  });

  group('the real connection', () {
    late _Transport transport;
    late InMemoryTokenStore store;
    late IdentityConnection real;

    String problem(IdentityErrorCode code) => jsonEncode({
      'type': 'about:blank',
      'title': code.code,
      'status': code.httpStatus,
      'code': code.code,
    });

    Future<void> signIn() async {
      await real.sessionManager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'secret'),
      );
      await real.reloadAccess();
    }

    setUp(() {
      transport = _Transport();
      store = InMemoryTokenStore();
      real = IdentityConnection(
        transport: transport,
        baseUri: Uri.parse('https://api.example.com'),
        tokenStore: store,
      );
    });

    tearDown(() => real.dispose());

    TransportResponse base(TransportRequest request) =>
        switch (request.uri.path) {
          '/v1/auth/sign-in' => TransportResponse(
            statusCode: 200,
            body: jsonEncode(
              _authenticated(
                'real-token',
                expiresAt: DateTime.now().add(const Duration(hours: 1)),
              ).toJson(),
            ),
          ),
          '/v1/me/access' => TransportResponse(
            statusCode: 200,
            body: jsonEncode(_access([Permission.tasksRead]).toJson()),
          ),
          '/v1/auth/sign-out' => const TransportResponse(statusCode: 204),
          _ => const TransportResponse(statusCode: 404),
        };

    for (final code in [
      IdentityErrorCode.tokenRevoked,
      IdentityErrorCode.userSuspended,
      IdentityErrorCode.tenantSuspended,
      IdentityErrorCode.sessionRevoked,
    ]) {
      test(
        '${code.code} on any authenticated route closes the session',
        () async {
          transport.answer = base;
          await signIn();
          expect(real.access.value, isNotNull);
          transport.answer = (request) => request.uri.path == '/v1/me/sessions'
              ? TransportResponse(
                  statusCode: code.httpStatus,
                  body: problem(code),
                )
              : base(request);

          await expectLater(
            real.apiClient.send(IdentityRoutes.listSessions, const PageQuery()),
            throwsA(isA<ApiErrorException>()),
          );

          expect(real.sessionManager.state, AuthState.signedOut);
          expect(real.access.value, isNull);
          expect(store.sessionToken, isNull);
        },
      );
    }

    test('a forbidden answer keeps the session', () async {
      transport.answer = base;
      await signIn();
      transport.answer = (request) => request.uri.path == '/v1/me/sessions'
          ? TransportResponse(
              statusCode: 403,
              body: jsonEncode({
                'type': 'about:blank',
                'title': 'Forbidden',
                'status': 403,
                'code': PlatformErrorCode.authForbidden.code,
              }),
            )
          : base(request);

      await expectLater(
        real.apiClient.send(IdentityRoutes.listSessions, const PageQuery()),
        throwsA(isA<ApiErrorException>()),
      );

      expect(real.sessionManager.state, AuthState.signedIn);
    });

    test('signOut posts the stored session token to sign-out', () async {
      transport.answer = base;
      await signIn();

      await real.signOut();

      final request = transport.requests.last;
      expect(request.uri.path, '/v1/auth/sign-out');
      expect(jsonDecode(request.body!), {'sessionToken': 'session-real-token'});
      expect(request.headers.containsKey('authorization'), isFalse);
    });

    test('the step-up goes out with the session access token', () async {
      transport.answer = (request) => switch (request.uri.path) {
        '/v1/me/step-up' => TransportResponse(
          statusCode: 201,
          body: jsonEncode({
            'mfaToken': 'step-1',
            'methods': ['device_otp'],
          }),
        ),
        _ => base(request),
      };
      await signIn();

      final pending = await real.sessionManager.startStepUp();

      expect(pending.methods, [MfaFactor.deviceOtp]);
      expect(
        transport.requests.last.headers['authorization'],
        'Bearer real-token',
      );
    });
  });
}
