import 'package:contracts/contracts.dart';

/// Identity operations the session uses, with the contract types.
///
/// Login from a new device has three steps: [signIn] returns
/// tokens or a pending challenge (`PendingMfa`); [requestMfaChallenge] creates the
/// challenge for the chosen method and sends the code; [verifyMfa] verifies it
/// with its `challengeId` and delivers the tokens.
///
/// Server errors are thrown as [ApiErrorException] and a request
/// that does not meet the contract as [ContractViolationException].
abstract interface class AuthRepository {
  /// `POST /v1/auth/sign-in`.
  Future<SignInResponse> signIn(SignInRequest request);

  /// `POST /v1/auth/mfa/challenges`.
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request);

  /// `POST /v1/auth/mfa/verify`.
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request);

  /// `POST /v1/auth/refresh`: rotates the session token and returns a new
  /// access token.
  ///
  /// [sessionToken] is the one stored in the [TokenStore]; it is null on web, where
  /// the browser sends the httpOnly cookie.
  Future<SessionTokens> refresh({String? sessionToken});

  /// `POST /v1/auth/sign-out`: revokes on the server the session of
  /// [sessionToken] (on web, the cookie's).
  Future<void> logout({String? sessionToken});

  /// `POST /v1/me/step-up`: opens the step-up of the current session and
  /// returns the methods it offers. Requires a session.
  Future<PendingMfa> startStepUp();

  /// `POST /v1/me/step-up/challenges`: creates the step-up challenge.
  Future<MfaChallenge> requestStepUpChallenge(MfaChallengeRequest request);

  /// `POST /v1/me/step-up/verify`: verifies the step-up and returns the
  /// new access token and the session's new `mfaVerifiedAt`.
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request);
}

/// Persistent storage of the session token.
///
/// The access token is never persisted: it lives only in the memory of
/// `SessionManager` and, on startup, is obtained with a refresh. On mobile the
/// real adapter uses Keychain or Keystore. On web the session token lives in an
/// httpOnly cookie the client cannot read: [CookieTokenStore] is used.
abstract interface class TokenStore {
  /// Whether the session token travels in an httpOnly cookie this store cannot see.
  ///
  /// With true, `SessionManager.restore` attempts the refresh even if
  /// [readSessionToken] returns null.
  bool get sessionInCookie;

  Future<String?> readSessionToken();
  Future<void> writeSessionToken(String sessionToken);
  Future<void> clear();
}

/// Web [TokenStore]: the session token is an httpOnly cookie managed by
/// the browser, so there is nothing to read or write.
final class CookieTokenStore implements TokenStore {
  const CookieTokenStore();

  @override
  bool get sessionInCookie => true;

  @override
  Future<String?> readSessionToken() async => null;

  @override
  Future<void> writeSessionToken(String sessionToken) async {}

  @override
  Future<void> clear() async {}
}

/// Device key that never leaves the hardware (Secure Enclave, Keystore or non-exportable WebCrypto).
abstract interface class DeviceKeyPort {
  /// Public key of the device, to register it.
  Future<List<int>> publicKey();

  /// Signs [data] with the device private key.
  Future<List<int>> sign(List<int> data);
}
