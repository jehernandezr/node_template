import 'dart:async';

import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';

/// Repositorio en memoria. Cada prueba configura los resultados y lee las
/// peticiones recibidas.
class FakeAuthRepository implements AuthRepository {
  /// Resultado de [signIn]. Si no hay, lanza `IDENTITY.AUTH.INVALID_CREDENTIALS`.
  SignInResponse? signInResult;

  /// Resultado de [requestMfaChallenge]. Si no hay, lanza
  /// `IDENTITY.MFA.TOKEN_INVALID`.
  MfaChallenge? challengeResult;

  /// Resultado de [verifyMfa]. Si no hay, lanza `IDENTITY.MFA.CODE_INVALID`.
  SignInResponse? verifyResult;

  /// Si no es null, [verifyMfa] lanza este error.
  Object? verifyError;

  /// Tokens que devuelve [refresh].
  SessionTokens? refreshResult;

  /// Si no es null, [refresh] lanza este error.
  Object? refreshError;

  /// Si no es null, [refresh] espera a que se complete antes de responder.
  Completer<void>? refreshGate;

  int signInCount = 0;
  int refreshCount = 0;
  int logoutCount = 0;

  /// Session token recibido en el último [refresh].
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
      throw StateError('FakeAuthRepository.refreshResult no configurado');
    }
    return tokens;
  }

  @override
  Future<void> logout({String? sessionToken}) async {
    logoutCount++;
    lastLogoutSessionToken = sessionToken;
  }

  /// Resultado de [startStepUp]. Si no hay, lanza
  /// `IDENTITY.SESSION.REVOKED`.
  PendingMfa? stepUpResult;

  /// Resultado de [requestStepUpChallenge]. Si no hay, lanza
  /// `IDENTITY.MFA.METHOD_UNAVAILABLE`.
  MfaChallenge? stepUpChallengeResult;

  /// Resultado de [verifyStepUp]. Si no hay, lanza
  /// `IDENTITY.MFA.CODE_INVALID`.
  StepUpResult? stepUpVerifyResult;

  int startStepUpCount = 0;
  MfaChallengeRequest? lastStepUpChallengeRequest;
  StepUpVerifyRequest? lastStepUpVerify;

  /// Session token recibido en el último [logout].
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

  /// Error de la API con [code], como lo lanzaría `ApiClient`.
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
