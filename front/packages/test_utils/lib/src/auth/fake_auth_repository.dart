import 'dart:async';

import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';

/// In-memory repository. Each test configures the results and reads the
/// received requests.
class FakeAuthRepository implements AuthRepository {
  /// Result of [signIn]. If there is none, throws `IDENTITY.AUTH.INVALID_CREDENTIALS`.
  SignInResponse? signInResult;

  /// Result of [requestMfaChallenge]. If there is none, throws
  /// `IDENTITY.MFA.TOKEN_INVALID`.
  MfaChallenge? challengeResult;

  /// Result of [verifyMfa]. If there is none, throws `IDENTITY.MFA.CODE_INVALID`.
  SignInResponse? verifyResult;

  /// If not null, [verifyMfa] throws this error.
  Object? verifyError;

  /// Tokens that [refresh] returns.
  SessionTokens? refreshResult;

  /// If not null, [refresh] throws this error.
  Object? refreshError;

  /// If not null, [refresh] waits for it to complete before responding.
  Completer<void>? refreshGate;

  int signInCount = 0;
  int refreshCount = 0;
  int logoutCount = 0;

  /// Session token received in the last [refresh].
  String? lastRefreshSessionToken;
  SignInRequest? lastSignIn;
  MfaChallengeRequest? lastChallengeRequest;
  MfaVerifyRequest? lastVerify;

  @override
  Future<SignInResponse> signIn(SignInRequest request) async {
    signInCount++;
    lastSignIn = request;
    return signInResult ??
        (throw apiError(IdentityErrorCode.authInvalidCredentials));
  }

  @override
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request) async {
    lastChallengeRequest = request;
    return challengeResult ??
        (throw apiError(IdentityErrorCode.mfaTokenInvalid));
  }

  @override
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request) async {
    lastVerify = request;
    final error = verifyError;
    if (error != null) throw error;
    return verifyResult ?? (throw apiError(IdentityErrorCode.mfaCodeInvalid));
  }

  @override
  Future<SessionTokens> refresh({String? sessionToken}) async {
    refreshCount++;
    lastRefreshSessionToken = sessionToken;
    final gate = refreshGate;
    if (gate != null) await gate.future;
    final error = refreshError;
    if (error != null) throw error;
    final tokens = refreshResult;
    if (tokens == null) {
      throw StateError('FakeAuthRepository.refreshResult not configured');
    }
    return tokens;
  }

  @override
  Future<void> logout({String? sessionToken}) async {
    logoutCount++;
    lastLogoutSessionToken = sessionToken;
  }

  /// Result of [startStepUp]. If there is none, throws
  /// `IDENTITY.SESSION.REVOKED`.
  PendingMfa? stepUpResult;

  /// Result of [requestStepUpChallenge]. If there is none, throws
  /// `IDENTITY.MFA.METHOD_UNAVAILABLE`.
  MfaChallenge? stepUpChallengeResult;

  /// Result of [verifyStepUp]. If there is none, throws
  /// `IDENTITY.MFA.CODE_INVALID`.
  StepUpResult? stepUpVerifyResult;

  int startStepUpCount = 0;
  MfaChallengeRequest? lastStepUpChallengeRequest;
  StepUpVerifyRequest? lastStepUpVerify;

  /// Session token received in the last [logout].
  String? lastLogoutSessionToken;

  @override
  Future<PendingMfa> startStepUp() async {
    startStepUpCount++;
    return stepUpResult ?? (throw apiError(IdentityErrorCode.sessionRevoked));
  }

  @override
  Future<MfaChallenge> requestStepUpChallenge(
    MfaChallengeRequest request,
  ) async {
    lastStepUpChallengeRequest = request;
    return stepUpChallengeResult ??
        (throw apiError(IdentityErrorCode.mfaMethodUnavailable));
  }

  @override
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request) async {
    lastStepUpVerify = request;
    return stepUpVerifyResult ??
        (throw apiError(IdentityErrorCode.mfaCodeInvalid));
  }

  /// API error with [code], as `ApiClient` would throw it.
  static ApiErrorException apiError(IdentityErrorCode code) =>
      ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: code.code,
          status: code.httpStatus,
          code: code.code,
        ),
      );
}
