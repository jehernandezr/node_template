import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';

import 'package:utils/utils.dart';

import '../../auth/fake_auth_repository.dart';
import '../../auth/fake_token_store.dart';

/// Builds the real [IdentityConnection] of the live scenarios over a
/// [FakeAuthRepository], with no network behind it.
final class ScenarioIdentity {
  /// Creates the builder. [permissions] are what `/v1/me/access` answers.
  const ScenarioIdentity({this.permissions = const [Permission.tasksRead]});

  /// Permissions of the session the connection loads.
  final List<Permission> permissions;

  /// A connection whose sign-in goes through [repository] and whose access
  /// loads [permissions] for [defaultUserId]. With no [tokenStore] the store
  /// is empty, so there is no session to restore. Its session manager reads
  /// token expiries with [clock].
  IdentityConnection build(
    FakeAuthRepository repository, {
    TokenStore? tokenStore,
    Clock clock = systemClock,
  }) {
    final manager = SessionManager(
      repository: repository,
      tokenStore: tokenStore ?? FakeTokenStore(),
      clock: clock,
    );
    return IdentityConnection.withParts(
      sessionManager: manager,
      apiClient: ApiClient(
        transport: _NoNetwork(),
        baseUri: Uri.parse('https://api.example.com'),
        accessToken: manager.accessToken,
      ),
      loadAccess: () async => SessionAccess(
        userId: defaultUserId,
        tenantId: '0193f1c2-0000-7000-8000-0000000000b1',
        sessionId: '0193f1c2-0000-7000-8000-0000000000c1',
        permissions: permissions,
        roles: const [],
        platformRoles: const [],
        permissionVersion: '1.1',
        features: const [],
        flags: const [],
        mfaVerifiedAt: null,
      ),
    );
  }

  /// Id of the user the connection loads.
  static const String defaultUserId = '0193f1c2-0000-7000-8000-0000000000a1';
}

/// Transport that answers every request with unavailable: the scenarios
/// never reach the API, only identity.
final class _NoNetwork implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) async =>
      const TransportResponse(statusCode: 503);

  @override
  void close() {}
}
