import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:test_utils/test_utils.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

final t0 = DateTime.utc(2026, 11, 13, 12);

const _challengeId = '0193f1c2-0000-7000-8000-0000000000e1';

SessionAccess _access() => SessionAccess(
  userId: '0193f1c2-0000-7000-8000-0000000000a1',
  tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
  sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
  permissions: const [Permission.tasksRead],
  roles: const <String>[],
  permissionVersion: '1.1',
  platformRoles: const [],
  features: const [],
  flags: const [],
  mfaVerifiedAt: null,
);

SessionTokens _tokens(String access) => SessionTokens(
  accessToken: access,
  accessExpiresAt: t0.add(const Duration(minutes: 15)),
  sessionToken: 'session-$access',
);

const _pending = PendingMfa(
  mfaToken: 'mfa-1',
  methods: [MfaFactor.passkey, MfaFactor.totp, MfaFactor.emailOtp],
);

final _challenge = MfaChallenge(
  challengeId: _challengeId,
  method: MfaFactor.totp,
  expiresAt: t0.add(const Duration(minutes: 5)),
);

class _Unreachable implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) =>
      throw TransportException(TransportFailure.connection, uri: request.uri);

  @override
  void close() {}
}

void main() {
  late _ScriptedRepository repo;
  late SessionManager manager;
  late IdentityConnection connection;
  late int accessLoads;

  setUp(() {
    repo = _ScriptedRepository();
    manager = SessionManager(
      repository: repo,
      tokenStore: FakeTokenStore(),
      clock: () => t0,
    );
    accessLoads = 0;
    connection = IdentityConnection.withParts(
      sessionManager: manager,
      apiClient: ApiClient(
        transport: _Unreachable(),
        baseUri: Uri.parse('https://api.example.com'),
      ),
      loadAccess: () async {
        accessLoads++;
        return _access();
      },
    );
  });

  tearDown(() => connection.dispose());

  group('SignInFlow', () {
    test('signs in without a second factor and loads the access', () async {
      repo.signInResult = SignInResponse(
        status: SignInStatus.authenticated,
        tokens: _tokens('a1'),
      );
      final flow = SignInFlow(connection);

      final done = await flow.signIn(email: 'ana@example.com', password: 'x');

      expect(done, isTrue);
      expect(accessLoads, 1);
      expect(flow.state.isBusy, isFalse);
      expect(flow.state.errorCode, isNull);
    });

    test('asks for a second factor and offers only code methods', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);

      final done = await flow.signIn(email: 'ana@example.com', password: 'x');

      expect(done, isFalse);
      expect(flow.state.pending, _pending);
      expect(flow.methods, [MfaFactor.totp, MfaFactor.emailOtp]);
    });

    test(
      'an expired code asks for a new challenge with the same token',
      () async {
        repo
          ..signInResult = const SignInResponse(
            status: SignInStatus.mfaRequired,
            mfa: _pending,
          )
          ..challengeResult = _challenge;
        final flow = SignInFlow(connection);
        await flow.signIn(email: 'ana@example.com', password: 'x');
        await flow.requestChallenge(MfaFactor.totp);
        expect(flow.state.challenge, _challenge);

        repo.verifyError = FakeAuthRepository.apiError(
          IdentityErrorCode.mfaCodeExpired,
        );

        final done = await flow.verify('12345678');

        expect(done, isFalse);
        expect(flow.state.errorCode, IdentityErrorCode.mfaCodeExpired.code);
        expect(flow.state.pending, _pending);
        expect(flow.state.challenge, isNull);
      },
    );

    test('a dead MFA token restarts the sign-in', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);
      await flow.signIn(email: 'ana@example.com', password: 'x');

      await flow.requestChallenge(MfaFactor.totp);

      expect(flow.state.errorCode, IdentityErrorCode.mfaTokenInvalid.code);
      expect(flow.state.pending, isNull);
      expect(flow.state.challenge, isNull);
    });

    test('a network failure shows the generic message', () async {
      final flow = SignInFlow(
        IdentityConnection.withParts(
          sessionManager: SessionManager(
            repository: ApiAuthRepository(
              connection.apiClient,
              sessionTransport: SessionTransport.bearer,
            ),
            tokenStore: FakeTokenStore(),
          ),
          apiClient: connection.apiClient,
          loadAccess: () async => _access(),
        ),
      );

      final done = await flow.signIn(
        email: 'ana@example.com',
        password: 'secret-value',
      );

      expect(done, isFalse);
      expect(flow.state.errorCode, PlatformErrorCode.internalUnexpected.code);
      expect(flow.state.isBusy, isFalse);
    });

    test('a programming error is not turned into a message', () async {
      final flow = SignInFlow(connection);

      await expectLater(
        flow.requestChallenge(MfaFactor.totp),
        throwsA(isA<StateError>()),
      );
      expect(flow.state.isBusy, isFalse);
    });
  });

  group('StepUpFlow', () {
    setUp(() async {
      repo.signInResult = SignInResponse(
        status: SignInStatus.authenticated,
        tokens: _tokens('a1'),
      );
      await manager.signIn(
        const SignInRequest(email: 'ana@example.com', password: 'x'),
      );
    });

    test('starts busy and verifies with the chosen method', () async {
      repo
        ..stepUpResult = _pending
        ..stepUpChallengeResult = _challenge
        ..stepUpVerifyResult = StepUpResult(
          tokens: _tokens('a2'),
          mfaVerifiedAt: t0,
        );
      final flow = StepUpFlow(manager);
      expect(flow.state.isBusy, isTrue);

      await flow.start();
      await flow.requestChallenge(MfaFactor.totp);
      final verifiedAt = await flow.verify('123456');

      expect(verifiedAt, t0);
      expect(repo.lastStepUpVerify?.challengeId, _challengeId);
    });

    test('a method that is not offered asks for another challenge', () async {
      repo.stepUpResult = _pending;
      final flow = StepUpFlow(manager);
      await flow.start();

      await flow.requestChallenge(MfaFactor.emailOtp);

      expect(flow.state.errorCode, IdentityErrorCode.mfaMethodUnavailable.code);
      expect(flow.state.pending, _pending);
      expect(flow.state.challenge, isNull);
    });
  });

  group('MfaFlow.state', () {
    test('a sign-in flow starts idle', () {
      expect(SignInFlow(connection).state, isA<MfaIdle>());
    });

    test('a second factor walks busy, then awaiting method', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);
      final seen = <Type>[];
      flow.addListener(() => seen.add(flow.state.runtimeType));

      await flow.signIn(email: 'ana@example.com', password: 'x');

      expect(seen, [MfaBusy, MfaAwaitingMethod]);
      expect((flow.state as MfaAwaitingMethod).pending, _pending);
    });

    test('a challenge moves the flow to awaiting code', () async {
      repo
        ..signInResult = const SignInResponse(
          status: SignInStatus.mfaRequired,
          mfa: _pending,
        )
        ..challengeResult = _challenge;
      final flow = SignInFlow(connection);
      await flow.signIn(email: 'ana@example.com', password: 'x');

      await flow.requestChallenge(MfaFactor.totp);

      expect(flow.state, isA<MfaAwaitingCode>());
      expect((flow.state as MfaAwaitingCode).challenge, _challenge);
    });

    for (final code in [
      IdentityErrorCode.mfaCodeExpired,
      IdentityErrorCode.mfaTooManyAttempts,
    ]) {
      test('${code.code} goes back to choosing a method', () async {
        repo
          ..signInResult = const SignInResponse(
            status: SignInStatus.mfaRequired,
            mfa: _pending,
          )
          ..challengeResult = _challenge
          ..verifyError = FakeAuthRepository.apiError(code);
        final flow = SignInFlow(connection);
        await flow.signIn(email: 'ana@example.com', password: 'x');
        await flow.requestChallenge(MfaFactor.totp);

        final done = await flow.verify('123456');

        expect(done, isFalse);
        final state = flow.state;
        expect(state, isA<MfaFailed>());
        expect((state as MfaFailed).errorCode, code.code);
        expect(state.step, isA<MfaAwaitingMethod>());
      });
    }

    test('a dead MFA token fails with an idle step', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);
      await flow.signIn(email: 'ana@example.com', password: 'x');

      await flow.requestChallenge(MfaFactor.totp);

      final state = flow.state;
      expect(state, isA<MfaFailed>());
      expect((state as MfaFailed).step, isA<MfaIdle>());
    });

    test('an error outside the reset list keeps the code step', () async {
      repo
        ..signInResult = const SignInResponse(
          status: SignInStatus.mfaRequired,
          mfa: _pending,
        )
        ..challengeResult = _challenge;
      final flow = SignInFlow(connection);
      await flow.signIn(email: 'ana@example.com', password: 'x');
      await flow.requestChallenge(MfaFactor.totp);

      await flow.verify('123456');

      final state = flow.state;
      expect(state, isA<MfaFailed>());
      final step = (state as MfaFailed).step;
      expect(step, isA<MfaAwaitingCode>());
      expect((step as MfaAwaitingCode).challenge, _challenge);
    });

    test('a programming error leaves the flow idle and not busy', () async {
      repo.signInError = TypeError();
      final flow = SignInFlow(connection);

      await expectLater(
        flow.signIn(email: 'ana@example.com', password: 'x'),
        throwsA(isA<TypeError>()),
      );

      expect(flow.state, isA<MfaIdle>());
      expect(flow.state.isBusy, isFalse);
    });

    test(
      'a call that finishes after dispose completes without throwing',
      () async {
        repo.signInResult = SignInResponse(
          status: SignInStatus.authenticated,
          tokens: _tokens('a1'),
        );
        final flow = SignInFlow(connection);

        final call = flow.signIn(email: 'ana@example.com', password: 'x');
        flow.dispose();

        await expectLater(call, completes);
      },
    );

    test('a sign-in without a second factor ends idle', () async {
      repo.signInResult = SignInResponse(
        status: SignInStatus.authenticated,
        tokens: _tokens('a1'),
      );
      final flow = SignInFlow(connection);

      await flow.signIn(email: 'ana@example.com', password: 'x');

      expect(flow.state, isA<MfaIdle>());
    });

    group('StepUpFlow state', () {
      setUp(() async {
        repo.signInResult = SignInResponse(
          status: SignInStatus.authenticated,
          tokens: _tokens('a1'),
        );
        await manager.signIn(
          const SignInRequest(email: 'ana@example.com', password: 'x'),
        );
      });

      test('starts busy at an idle step', () {
        final state = StepUpFlow(manager).state;

        expect(state, isA<MfaBusy>());
        expect((state as MfaBusy).step, isA<MfaIdle>());
      });

      for (final code in [
        IdentityErrorCode.mfaCodeExpired,
        IdentityErrorCode.mfaTooManyAttempts,
        IdentityErrorCode.mfaMethodUnavailable,
      ]) {
        test('${code.code} goes back to choosing a method', () async {
          repo
            ..stepUpResult = _pending
            ..stepUpChallengeResult = _challenge
            ..stepUpVerifyError = FakeAuthRepository.apiError(code);
          final flow = StepUpFlow(manager);
          await flow.start();
          await flow.requestChallenge(MfaFactor.totp);

          final verified = await flow.verify('123456');

          expect(verified, isNull);
          final state = flow.state;
          expect(state, isA<MfaFailed>());
          expect((state as MfaFailed).errorCode, code.code);
          expect(state.step, isA<MfaAwaitingMethod>());
        });
      }
    });
  });
}

final class _ScriptedRepository extends FakeAuthRepository {
  Object? signInError;
  Object? stepUpVerifyError;

  @override
  Future<SignInResponse> signIn(SignInRequest request) async {
    final error = signInError;
    if (error != null) throw error;
    return super.signIn(request);
  }

  @override
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request) async {
    final error = stepUpVerifyError;
    if (error != null) throw error;
    return super.verifyStepUp(request);
  }
}
