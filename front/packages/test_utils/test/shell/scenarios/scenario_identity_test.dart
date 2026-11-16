import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  test('with no token store there is no session to restore', () async {
    final auth = FakeAuthRepository();
    final connection = const ScenarioIdentity().build(auth);
    try {
      expect(await connection.restore(), isFalse);
      expect(auth.refreshCount, 0);
    } finally {
      await connection.dispose();
    }
  });

  test(
    'reloadAccess serves the default user and the permissions asked',
    () async {
      const permissions = [Permission.tasksRead, Permission.tasksWrite];
      final connection = const ScenarioIdentity(permissions: permissions)
          .build(FakeAuthRepository());
      try {
        final access = await connection.reloadAccess();

        expect(access.userId, ScenarioIdentity.defaultUserId);
        expect(access.permissions, permissions);
      } finally {
        await connection.dispose();
      }
    },
  );

  test(
    'signing in opens the session with the tokens of the repository',
    () async {
      final clock = FakeClock();
      final fake = FakeAuthRepository()
        ..signInResult = SignInResponse(
          status: SignInStatus.authenticated,
          tokens: SessionTokens(
            accessToken: 'access-1',
            accessExpiresAt: clock.now().add(const Duration(hours: 1)),
          ),
        );
      final connection = const ScenarioIdentity().build(fake, clock: clock.now);
      try {
        await connection.sessionManager.signIn(
          const SignInRequest(email: 'ana@example.com', password: 'secret'),
        );

        expect(connection.sessionManager.state, AuthState.signedIn);
        expect(await connection.sessionManager.accessToken(), 'access-1');
      } finally {
        await connection.dispose();
      }
    },
  );
}
