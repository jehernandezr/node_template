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
    expect((await store.read())?.accessToken, 'access-1');
    expect(manager.state, AuthState.signedIn);
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
    expect(await store.read(), isNull);

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
    expect((await store.read())?.accessToken, 'access-2');
    expect(manager.state, AuthState.signedIn);
  });

  test('concurrent refresh calls share one request', () async {
    await store.write(tokens('old', t0.add(const Duration(minutes: 1))));
    await manager.restore();
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
    await store.write(tokens('access-1', t0.add(const Duration(minutes: 15))));
    await manager.restore();
    repo.refreshResult = tokens('access-2', t0.add(const Duration(minutes: 30)));

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
    expect(await store.read(), isNull);
    expect(manager.state, AuthState.signedOut);
    await expectLater(
      manager.accessToken(),
      throwsA(isA<AuthException>()),
    );
  });

  test('invalidated refresh signs out and clears the store', () async {
    await store.write(tokens('old', t0.add(const Duration(minutes: 1))));
    await manager.restore();
    repo.refreshError = const AuthException('IDENTITY.SESSION.REVOKED');

    await expectLater(manager.accessToken(), throwsA(isA<AuthException>()));

    expect(await store.read(), isNull);
    expect(manager.state, AuthState.signedOut);
  });

  test('a network error during refresh keeps the session', () async {
    await store.write(tokens('old', t0.add(const Duration(minutes: 1))));
    await manager.restore();
    repo.refreshError = Exception('offline');

    await expectLater(manager.accessToken(), throwsException);

    expect(await store.read(), isNotNull);
    expect(manager.state, AuthState.signedIn);
  });
}
