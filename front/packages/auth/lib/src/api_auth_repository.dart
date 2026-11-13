import 'package:api/api.dart';
import 'package:contracts/contracts.dart';

import 'ports.dart';

/// [AuthRepository] sobre las rutas públicas de identity.
///
/// Cada llamada pasa por [ApiClient], que valida la petición contra el
/// contrato antes de tocar la red y decodifica la respuesta con los tipos
/// generados. El cliente puede no tener access token: las rutas del login no
/// exigen sesión.
///
/// El contrato todavía no publica las rutas de refresh ni de cierre de sesión.
/// Hasta entonces [refresh] responde sin llamar a la red lo mismo que el
/// servidor ante una sesión inexistente (`PLATFORM.AUTH.UNAUTHENTICATED`), así
/// que `SessionManager` cierra la sesión cuando vence el access token y
/// `restore` devuelve false; y [logout] solo cierra la sesión local.
final class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(this.client);

  final ApiClient client;

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
  Future<SessionTokens> refresh({String? sessionToken}) async {
    const code = PlatformErrorCode.authUnauthenticated;
    throw ApiErrorException(
      ProblemDetails(
        type: 'about:blank',
        title: 'Unauthenticated',
        status: code.httpStatus,
        code: code.code,
      ),
    );
  }

  @override
  Future<void> logout() async {}
}
