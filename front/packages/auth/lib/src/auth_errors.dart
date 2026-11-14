import 'package:contracts/contracts.dart';

/// No hay sesión abierta, o un cierre de sesión anuló la operación en curso.
///
/// Es el único error propio del paquete. Los errores del servidor llegan como
/// [ApiErrorException] con su código del contrato, y una petición que no
/// cumple el contrato como [ContractViolationException].
final class SignedOutException implements Exception {
  const SignedOutException();

  @override
  String toString() => 'SignedOutException';
}

/// Códigos de identity que cierran la sesión, sea que los devuelva un
/// refresh o el guard de cualquier ruta autenticada.
///
/// Son los de la invalidación de tokens del plan: sesión revocada, vencida o
/// reutilizada (reusar un session token ya rotado revoca la sesión completa),
/// access token revocado por la época del usuario o del tenant, y usuario o
/// tenant suspendido. `IDENTITY.TOKEN.STALE_PERMISSIONS` no está: con él el
/// cliente refresca y reintenta. `PLATFORM.AUTH.UNAUTHENTICATED` cierra la
/// sesión cuando lo responde un refresh: lo decide `SessionManager`, porque no
/// es un código de identity.
const Set<IdentityErrorCode> defaultInvalidationCodes = {
  IdentityErrorCode.sessionRevoked,
  IdentityErrorCode.sessionExpired,
  IdentityErrorCode.sessionReused,
  IdentityErrorCode.tokenRevoked,
  IdentityErrorCode.userSuspended,
  IdentityErrorCode.tenantSuspended,
};
