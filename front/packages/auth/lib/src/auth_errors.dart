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

/// Códigos que cierran la sesión cuando un refresh los devuelve.
///
/// Hoy el contrato `identity` solo publica `IDENTITY.SESSION.REVOKED`. Si
/// agrega otros (sesión reutilizada, usuario o tenant suspendido), se suman
/// aquí. `PLATFORM.AUTH.UNAUTHENTICATED` también cierra la sesión: lo decide
/// `SessionManager`, porque no es un código de identity.
const Set<IdentityErrorCode> defaultInvalidationCodes = {
  IdentityErrorCode.sessionRevoked,
};
