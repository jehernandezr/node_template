import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:auth/auth.dart';

final t0 = DateTime.utc(2026, 11, 11, 12);

AuthTokens tokens(String access, DateTime expiresAt) => AuthTokens(
  accessToken: access,
  accessExpiresAt: expiresAt,
  sessionToken: 'session-$access',
);

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
  Future<void> signIn(AuthTokens initial) async {
    repo.loginResult = LoginSucceeded(initial);
    await manager.login('ana@example.com', 'secret');
  }

  test('login success stores tokens and signs in', () async {
    repo.loginResult = LoginSucceeded(
      tokens('access-1', t0.add(const Duration(minutes: 15))),
    );

    final result = await manager.login(
      'ana@example.com',
      'secret',
      deviceId: 'device-1',
    );

    expect(result, isA<LoginSucceeded>());
    expect(repo.lastLoginDeviceId, 'device-1');
    expect(store.sessionToken, 'session-access-1');
    expect(manager.state, AuthState.signedIn);
    expect(await manager.accessToken(), 'access-1');
  });

  test('MFA path emits no tokens until the challenge is verified', () async {
    repo.loginResult = LoginRequiresMfa(
      const MfaChallenge(
        mfaToken: 'mfa-1',
        methods: {MfaMethod.deviceOtp, MfaMethod.emailOtp},
      ),
    );

    final first = await manager.login('ana@example.com', 'secret');
    expect(first, isA<LoginRequiresMfa>());
    expect(manager.state, AuthState.signedOut);
    expect(store.sessionToken, isNull);

    repo.mfaResult = LoginSucceeded(
      tokens('access-2', t0.add(const Duration(minutes: 15))),
    );
    final second = await manager.verifyMfa(
      'mfa-1',
      MfaMethod.deviceOtp,
      '12345678',
      registerDevice: true,
    );

    expect(second, isA<LoginSucceeded>());
    expect(repo.lastMfaMethod, MfaMethod.deviceOtp);
    expect(repo.lastMfaCode, '12345678');
    expect(repo.lastDevicePublicKey, [1, 2, 3, 4]);
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
    repo.loginResult = LoginSucceeded(
      tokens('access-1', t0.add(const Duration(minutes: 15))),
    );
    await manager.login('ana@example.com', 'secret');

    await manager.logout();

    expect(repo.logoutCount, 1);
    expect(store.sessionToken, isNull);
    expect(manager.state, AuthState.signedOut);
    await expectLater(manager.accessToken(), throwsA(isA<AuthException>()));
  });

  test('invalidated refresh signs out and clears the store', () async {
    await signIn(tokens('old', t0.add(const Duration(minutes: 1))));
    repo.refreshError = const AuthException('IDENTITY.SESSION.REVOKED');

    await expectLater(manager.accessToken(), throwsA(isA<AuthException>()));

    expect(store.sessionToken, isNull);
    expect(manager.state, AuthState.signedOut);
  });

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
    await expectLater(manager.refresh(), throwsA(isA<AuthException>()));
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
      repo.refreshResult = AuthTokens(
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
      repo.refreshError = const AuthException('IDENTITY.SESSION.REVOKED');

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
        await expectLater(manager.accessToken(), throwsA(isA<AuthException>()));
      },
    );

    test('logout during the login write does not sign in', () async {
      repo.loginResult = LoginSucceeded(
        tokens('access-1', t0.add(const Duration(minutes: 15))),
      );
      store.writeGate = Completer<void>();

      final loggingIn = manager.login('ana@example.com', 'secret');
      await pumpEventQueue();
      final loggingOut = manager.logout();
      await pumpEventQueue();
      store.writeGate!.complete();
      await loggingOut;

      await expectLater(
        loggingIn,
        throwsA(
          isA<AuthException>().having(
            (e) => e.code,
            'code',
            signedOutErrorCode,
          ),
        ),
      );
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

      await expectLater(refreshing, throwsA(isA<AuthException>()));
      expect(manager.state, AuthState.signedOut);
      expect(store.sessionToken, isNull);
    });
  });
}
