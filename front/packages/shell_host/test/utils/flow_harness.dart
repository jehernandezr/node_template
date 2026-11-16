import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:test_utils/test_utils.dart';

import 'scripted_transport.dart';

/// An `IdentityConnection` over a `FakeAuthRepository`, with helpers that
/// script the sign-in and step-up answers the forms need.
final class FlowHarness {
  FlowHarness() : repo = FakeAuthRepository() {
    connection = IdentityConnection.withParts(
      sessionManager: SessionManager(
        repository: repo,
        tokenStore: FakeTokenStore(),
        clock: () => now,
      ),
      apiClient: ApiClient(
        transport: ScriptedTransport.unavailable(),
        baseUri: Uri.parse('https://api.example.com'),
      ),
      loadAccess: () async => _access(),
    );
  }

  /// Time of the session manager.
  static final DateTime now = DateTime.utc(2026, 11, 13, 12);

  /// Code the scripted challenge asks for.
  static const String validCode = '123456';

  static const PendingMfa _pending = PendingMfa(
    mfaToken: 'mfa-1',
    methods: [MfaFactor.totp, MfaFactor.emailOtp],
  );

  final FakeAuthRepository repo;
  late final IdentityConnection connection;

  /// Opens a session in the manager and publishes its access, as a finished
  /// sign-in does. The step-up needs an open session.
  Future<void> signIn() async {
    repo.signInResult = SignInResponse(
      status: SignInStatus.authenticated,
      tokens: _tokens('a1'),
    );
    await connection.sessionManager.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'x'),
    );
    await connection.reloadAccess();
  }

  /// Makes `signIn` answer that a second factor is required.
  void requireSecondFactor() {
    repo.signInResult = const SignInResponse(
      status: SignInStatus.mfaRequired,
      mfa: _pending,
    );
  }

  /// Makes `startStepUp` offer the methods of a second factor.
  void offerStepUp() {
    repo.stepUpResult = _pending;
  }

  /// Makes a requested challenge succeed (a TOTP challenge).
  void offerChallenge() {
    final challenge = MfaChallenge(
      challengeId: '0193f1c2-0000-7000-8000-0000000000e1',
      method: MfaFactor.totp,
      expiresAt: now.add(const Duration(minutes: 5)),
    );
    repo
      ..challengeResult = challenge
      ..stepUpChallengeResult = challenge;
  }

  /// Makes the step-up verification succeed with `mfaVerifiedAt` [now].
  void acceptStepUp() {
    repo.stepUpVerifyResult = StepUpResult(
      tokens: _tokens('a2'),
      mfaVerifiedAt: now,
    );
  }

  Future<void> dispose() => connection.dispose();

  static SessionTokens _tokens(String access) => SessionTokens(
    accessToken: access,
    accessExpiresAt: now.add(const Duration(minutes: 15)),
    sessionToken: 'session-$access',
  );

  static SessionAccess _access() => SessionAccess(
    userId: '0193f1c2-0000-7000-8000-0000000000a1',
    tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
    sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
    permissions: const [Permission.tasksRead],
    roles: const [],
    platformRoles: const [],
    permissionVersion: '1.1',
    features: const [],
    flags: const [],
    mfaVerifiedAt: null,
  );
}
