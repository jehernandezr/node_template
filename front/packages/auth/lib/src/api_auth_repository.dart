import 'package:api/api.dart';
import 'package:contracts/contracts.dart';

import 'ports.dart';

/// [AuthRepository] sobre las rutas de identity.
///
/// Cada llamada pasa por [ApiClient], que valida la petición contra el
/// contrato antes de tocar la red y decodifica la respuesta con los tipos
/// generados.
///
/// El login, el refresh y el cierre de sesión son rutas públicas y van por
/// [client], que no lleva access token: el refresh y el cierre se identifican
/// con el session token (en el cuerpo en móvil, en la cookie httpOnly en web).
/// El paso adicional exige la sesión abierta y va por [sessionClient], que
/// firma con el access token de la sesión.
final class ApiAuthRepository implements AuthRepository {
  /// Repositorio sobre [client]. Sin [sessionClient], el paso adicional usa
  /// [client] y, como no tiene token, falla con
  /// `PLATFORM.AUTH.UNAUTHENTICATED` sin llamar a la red.
  ApiAuthRepository(this.client, {ApiClient? sessionClient})
    : sessionClient = sessionClient ?? client;

  /// Cliente sin sesión, para las rutas públicas.
  final ApiClient client;

  /// Cliente con el access token de la sesión, para el paso adicional.
  final ApiClient sessionClient;

  @override
  Future<SignInResponse> signIn(SignInRequest request) =>
      client.send(IdentityRoutes.signIn, request);

  @override
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request) =>
      client.send(IdentityRoutes.requestMfaChallenge, request);

  @override
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request) =>
      client.send(IdentityRoutes.verifyMfa, request);

  @override
  Future<SessionTokens> refresh({String? sessionToken}) => client.send(
    IdentityRoutes.refreshSession,
    SessionTokenRequest(sessionToken: sessionToken),
  );

  @override
  Future<void> logout({String? sessionToken}) => client.send(
    IdentityRoutes.signOut,
    SessionTokenRequest(sessionToken: sessionToken),
  );

  @override
  Future<PendingMfa> startStepUp() =>
      sessionClient.send(IdentityRoutes.startStepUp, const Empty());

  @override
  Future<MfaChallenge> requestStepUpChallenge(MfaChallengeRequest request) =>
      sessionClient.send(IdentityRoutes.requestStepUpChallenge, request);

  @override
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request) =>
      sessionClient.send(IdentityRoutes.verifyStepUp, request);
}
