import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:auth/testing.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

final t0 = DateTime.utc(2026, 11, 13, 12);

const _challengeId = '0193f1c2-0000-7000-8000-0000000000e1';

SessionAccess _access() => SessionAccess(
  userId: '0193f1c2-0000-7000-8000-0000000000a1',
  tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
  sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
  permissions: const [Permission.tasksRead],
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
  late FakeAuthRepository repo;
  late SessionManager manager;
  late IdentityConnection connection;
  late int accessLoads;

  setUp(() {
    repo = FakeAuthRepository();
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
      expect(flow.busy, isFalse);
      expect(flow.errorCode, isNull);
    });

    test('asks for a second factor and offers only code methods', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);

      final done = await flow.signIn(email: 'ana@example.com', password: 'x');

      expect(done, isFalse);
      expect(flow.pending, _pending);
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
        expect(flow.challenge, _challenge);

        repo.verifyError = FakeAuthRepository.apiError(
          IdentityErrorCode.mfaCodeExpired,
        );

        final done = await flow.verify('12345678');

        expect(done, isFalse);
        expect(flow.errorCode, IdentityErrorCode.mfaCodeExpired.code);
        expect(flow.pending, _pending);
        expect(flow.challenge, isNull);
      },
    );

    test('a dead MFA token restarts the sign-in', () async {
      repo.signInResult = const SignInResponse(
        status: SignInStatus.mfaRequired,
        mfa: _pending,
      );
      final flow = SignInFlow(connection);
      await flow.signIn(email: 'ana@example.com', password: 'x');

      // Without a configured challenge the fake answers MFA.TOKEN_INVALID.
      await flow.requestChallenge(MfaFactor.totp);

      expect(flow.errorCode, IdentityErrorCode.mfaTokenInvalid.code);
      expect(flow.pending, isNull);
      expect(flow.challenge, isNull);
    });

    test('a network failure shows the generic message', () async {
      final flow = SignInFlow(
        IdentityConnection.withParts(
          sessionManager: SessionManager(
            repository: ApiAuthRepository(connection.apiClient),
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
      expect(flow.errorCode, PlatformErrorCode.internalUnexpected.code);
      expect(flow.busy, isFalse);
    });

    test('a programming error is not turned into a message', () async {
      final flow = SignInFlow(connection);

      await expectLater(
        flow.requestChallenge(MfaFactor.totp),
        throwsA(isA<StateError>()),
      );
      expect(flow.busy, isFalse);
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
      expect(flow.busy, isTrue);

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

      // Without a configured challenge the fake answers METHOD_UNAVAILABLE.
      await flow.requestChallenge(MfaFactor.emailOtp);

      expect(flow.errorCode, IdentityErrorCode.mfaMethodUnavailable.code);
      expect(flow.pending, _pending);
      expect(flow.challenge, isNull);
    });
  });
}
