import 'dart:async';

import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

final t0 = DateTime.utc(2026, 11, 11, 12);

const challengeId = '0193f1c2-0000-7000-8000-000000000001';

SessionTokens tokens(String access, DateTime expiresAt) => SessionTokens(
  accessToken: access,
  accessExpiresAt: expiresAt,
  sessionToken: 'session-$access',
);

SignInResponse authenticated(SessionTokens tokens) =>
    SignInResponse(status: SignInStatus.authenticated, tokens: tokens);

const credentials = SignInRequest(email: 'ana@example.com', password: 'secret');

final revoked = FakeAuthRepository.apiError(IdentityErrorCode.sessionRevoked);

void main() {
  late FakeAuthRepository repo;
  late InMemoryTokenStore store;
  late FakeDeviceKeyPort keys;
  late DateTime now;
  late SessionManager manager;

  setUp(() {
    repo = FakeAuthRepository();
    store = InMemoryTokenStore();
    keys = FakeDeviceKeyPort();
    now = t0;
    manager = SessionManager(
      repository: repo,
      tokenStore: store,
      deviceKeys: keys,
      clock: () => now,
    );
  });

  /// Abre la sesión con [initial] por la vía del login.
  Future<void> signIn(SessionTokens initial) async {
    repo.signInResult = authenticated(initial);
    await manager.signIn(credentials);
  }

  test('sign-in success stores tokens and signs in', () async {
    repo.signInResult = authenticated(
      tokens('access-1', t0.add(const Duration(minutes: 15))),
    );

    final result = await manager.signIn(
      const SignInRequest(
        email: 'ana@example.com',
        password: 'secret',
        deviceId: 'device-1',
      ),
    );

    expect(result.status, SignInStatus.authenticated);
    expect(repo.lastSignIn?.deviceId, 'device-1');
    expect(store.sessionToken, 'session-access-1');
    expect(manager.state, AuthState.signedIn);
    expect(await manager.accessToken(), 'access-1');
  });

  test('rejected credentials throw the contract error and keep the session '
      'closed', () async {
    await expectLater(
      manager.signIn(credentials),
      throwsA(
        isA<ApiErrorException>().having(
          (e) => IdentityErrorCode.fromCode(e.problem.code),
          'code',
          IdentityErrorCode.authInvalidCredentials,
        ),
      ),
    );
    expect(manager.state, AuthState.signedOut);
  });

  test('MFA: sign-in, challenge and verify with challengeId', () async {
    repo.signInResult = const SignInResponse(
      status: SignInStatus.mfaRequired,
      mfa: PendingMfa(
        mfaToken: 'mfa-1',
        methods: [MfaFactor.deviceOtp, MfaFactor.emailOtp],
      ),
    );

    final first = await manager.signIn(credentials);
    expect(first.status, SignInStatus.mfaRequired);
    expect(first.mfa?.methods, [MfaFactor.deviceOtp, MfaFactor.emailOtp]);
    expect(manager.state, AuthState.signedOut);
    expect(store.sessionToken, isNull);

    repo.challengeResult = MfaChallenge(
      challengeId: challengeId,
      method: MfaFactor.deviceOtp,
      expiresAt: t0.add(const Duration(seconds: MfaRules.deviceCodeTtlSeconds)),
      codeLength: MfaRules.deviceCodeLength,
    );
    final challenge = await manager.requestMfaChallenge(
      mfaToken: 'mfa-1',
      method: MfaFactor.deviceOtp,
    );
    expect(repo.lastChallengeRequest?.mfaToken, 'mfa-1');
    expect(repo.lastChallengeRequest?.method, MfaFactor.deviceOtp);
    expect(manager.state, AuthState.signedOut);

    repo.verifyResult = authenticated(
      tokens('access-2', t0.add(const Duration(minutes: 15))),
    );
    final second = await manager.verifyMfa(
      mfaToken: 'mfa-1',
      challengeId: challenge.challengeId,
      code: '12345678',
      registerDevice: true,
    );

    expect(second.status, SignInStatus.authenticated);
    expect(repo.lastVerify?.challengeId, challengeId);
    expect(repo.lastVerify?.code, '12345678');
    // [1, 2, 3, 4] en base64url sin relleno, como pide el contrato.
    expect(repo.lastVerify?.devicePublicKey, 'AQIDBA');
    expect(MfaVerifyRequestSchema.validate(repo.lastVerify!.toJson()), isEmpty);
    expect(store.sessionToken, 'session-access-2');
    expect(manager.state, AuthState.signedIn);
  });

  test('concurrent refresh calls share one request', () async {
    await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
    repo.refreshResult = tokens('new', t0.add(const Duration(minutes: 15)));
    repo.refreshGate = Completer<void>();

    final calls = Future.wait([
      for (var i = 0; i < 3; i++) manager.accessToken(),
    ]);
    await Future<void>.delayed(Duration.zero);
    expect(manager.state, AuthState.refreshing);

    repo.refreshGate!.complete();

    expect(await calls, everyElement('new'));
    expect(repo.refreshCount, 1);
    expect(manager.state, AuthState.signedIn);
  });

  test('refreshes only when the access token is near expiry', () async {
    await signIn(tokens('access-1', t0.add(const Duration(minutes: 15))));
    repo.refreshResult = tokens(
      'access-2',
      t0.add(const Duration(minutes: 30)),
    );

    expect(await manager.accessToken(), 'access-1');

    now = t0.add(const Duration(minutes: 12));
    expect(await manager.accessToken(), 'access-1');
    expect(repo.refreshCount, 0);

    now = t0.add(const Duration(minutes: 14));
    expect(await manager.accessToken(), 'access-2');
    expect(repo.refreshCount, 1);
  });

  test('logout clears the store and signs out', () async {
    await signIn(tokens('access-1', t0.add(const Duration(minutes: 15))));

    await manager.logout();

    expect(repo.logoutCount, 1);
    expect(store.sessionToken, isNull);
    expect(manager.state, AuthState.signedOut);
    expect(await manager.accessToken(), isNull);
  });

  test('invalidated refresh signs out and clears the store', () async {
    await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
    repo.refreshError = revoked;

    await expectLater(manager.accessToken(), throwsA(isA<ApiErrorException>()));

    expect(store.sessionToken, isNull);
    expect(manager.state, AuthState.signedOut);
  });

  test('an unauthenticated refresh also signs out', () async {
    await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
    const code = PlatformErrorCode.authUnauthenticated;
    repo.refreshError = ApiErrorException(
      ProblemDetails(
        type: 'about:blank',
        title: 'Unauthenticated',
        status: code.httpStatus,
        code: code.code,
      ),
    );

    await expectLater(manager.accessToken(), throwsA(isA<ApiErrorException>()));
    expect(manager.state, AuthState.signedOut);
  });

  test(
    'an identity error that is not an invalidation keeps the session',
    () async {
      await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
      repo.refreshError = FakeAuthRepository.apiError(
        IdentityErrorCode.tokenStalePermissions,
      );

      await expectLater(
        manager.accessToken(),
        throwsA(isA<ApiErrorException>()),
      );
      expect(manager.state, AuthState.signedIn);
      expect(store.sessionToken, isNotNull);
    },
  );

  test('a network error during refresh keeps the session', () async {
    await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
    repo.refreshError = Exception('offline');

    await expectLater(manager.accessToken(), throwsException);

    expect(store.sessionToken, isNotNull);
    expect(manager.state, AuthState.signedIn);
  });

  test(
    'refresh forces a new access token while the current one is valid',
    () async {
      await signIn(tokens('access-1', t0.add(const Duration(minutes: 15))));
      repo.refreshResult = tokens(
        'access-2',
        t0.add(const Duration(minutes: 30)),
      );

      await manager.refresh();

      expect(repo.refreshCount, 1);
      expect(repo.lastRefreshSessionToken, 'session-access-1');
      expect(await manager.accessToken(), 'access-2');
      expect(store.sessionToken, 'session-access-2');
    },
  );

  test('refresh without a session throws', () async {
    await expectLater(manager.refresh(), throwsA(isA<SignedOutException>()));
    expect(repo.refreshCount, 0);
  });

  group('restore', () {
    test('refreshes with the stored session token; the access token is '
        'never stored', () async {
      store = InMemoryTokenStore('session-stored');
      manager = SessionManager(
        repository: repo,
        tokenStore: store,
        clock: () => now,
      );
      repo.refreshResult = tokens('fresh', t0.add(const Duration(minutes: 15)));

      expect(await manager.restore(), isTrue);

      expect(repo.lastRefreshSessionToken, 'session-stored');
      expect(manager.state, AuthState.signedIn);
      expect(await manager.accessToken(), 'fresh');
      expect(store.sessionToken, 'session-fresh');
    });

    test('does nothing without a stored session token', () async {
      expect(await manager.restore(), isFalse);

      expect(repo.refreshCount, 0);
      expect(manager.state, AuthState.signedOut);
    });

    test('with a cookie store it refreshes without a stored token', () async {
      manager = SessionManager(
        repository: repo,
        tokenStore: const CookieTokenStore(),
        clock: () => now,
      );
      repo.refreshResult = SessionTokens(
        accessToken: 'cookie-access',
        accessExpiresAt: DateTime.utc(2026, 11, 11, 12, 15),
      );

      expect(await manager.restore(), isTrue);

      expect(repo.lastRefreshSessionToken, isNull);
      expect(await manager.accessToken(), 'cookie-access');
    });

    test('a rejected session returns false and clears the store', () async {
      store = InMemoryTokenStore('session-stored');
      manager = SessionManager(
        repository: repo,
        tokenStore: store,
        clock: () => now,
      );
      repo.refreshError = revoked;

      expect(await manager.restore(), isFalse);

      expect(store.sessionToken, isNull);
      expect(manager.state, AuthState.signedOut);
    });
  });

  group('logout wins over pending work', () {
    test(
      'logout during the refresh write does not revive the session',
      () async {
        store = InMemoryTokenStore('session-old');
        manager = SessionManager(
          repository: repo,
          tokenStore: store,
          clock: () => now,
        );
        repo.refreshResult = tokens('new', t0.add(const Duration(minutes: 15)));
        store.writeGate = Completer<void>();

        final restoring = manager.restore();
        await pumpEventQueue();
        expect(store.writeCount, 1);

        final loggingOut = manager.logout();
        await pumpEventQueue();
        expect(manager.state, AuthState.signedOut);

        store.writeGate!.complete();
        await loggingOut;

        expect(await restoring, isFalse);
        expect(manager.state, AuthState.signedOut);
        expect(store.sessionToken, isNull);
        expect(await manager.accessToken(), isNull);
      },
    );

    test('logout during the sign-in write does not sign in', () async {
      repo.signInResult = authenticated(
        tokens('access-1', t0.add(const Duration(minutes: 15))),
      );
      store.writeGate = Completer<void>();

      final loggingIn = manager.signIn(credentials);
      await pumpEventQueue();
      final loggingOut = manager.logout();
      await pumpEventQueue();
      store.writeGate!.complete();
      await loggingOut;

      await expectLater(loggingIn, throwsA(isA<SignedOutException>()));
      expect(manager.state, AuthState.signedOut);
      expect(store.sessionToken, isNull);
    });

    test('a refresh that answers after logout is dropped', () async {
      await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
      repo.refreshResult = tokens('new', t0.add(const Duration(minutes: 15)));
      repo.refreshGate = Completer<void>();

      final refreshing = manager.accessToken();
      await pumpEventQueue();
      await manager.logout();
      repo.refreshGate!.complete();

      await expectLater(refreshing, throwsA(isA<SignedOutException>()));
      expect(manager.state, AuthState.signedOut);
      expect(store.sessionToken, isNull);
    });
  });
}
