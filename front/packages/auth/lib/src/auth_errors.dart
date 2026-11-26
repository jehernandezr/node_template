import 'package:contracts/contracts.dart';

/// There is no open session, or a sign-out cancelled the operation in progress.
///
/// It is the package's only own error. Server errors arrive as
/// [ApiErrorException] with their contract code, and a request that does not
/// meet the contract as [ContractViolationException].
final class SignedOutException implements Exception {
  /// Signals that there is no session to act on.
  const SignedOutException();

  @override
  String toString() => 'SignedOutException';
}

/// Identity codes that close the session, whether returned by a
/// refresh or by the guard of any authenticated route.
///
/// They are the ones that invalidate tokens per ADR 0005: revoked, expired or
/// reused session (reusing an already rotated session token revokes the whole session),
/// access token revoked by the user or tenant epoch, and suspended user or
/// tenant. `IDENTITY.TOKEN.STALE_PERMISSIONS` is not included: with it the
/// client refreshes and retries. Neither is `PLATFORM.AUTH.TOKEN_EXPIRED`: the
/// expired access token also refreshes and retries, only once.
/// `PLATFORM.AUTH.UNAUTHENTICATED` closes the session when a refresh
/// returns it: `SessionManager` decides that, because it is not an identity code.
const Set<IdentityErrorCode> defaultInvalidationCodes = {
  IdentityErrorCode.sessionRevoked,
  IdentityErrorCode.sessionExpired,
  IdentityErrorCode.sessionReused,
  IdentityErrorCode.tokenRevoked,
  IdentityErrorCode.userSuspended,
  IdentityErrorCode.tenantSuspended,
};
