import 'package:contracts/contracts.dart' show MfaFactor;

/// Perfil del usuario autenticado.
final class AccountProfile {
  const AccountProfile({
    required this.name,
    required this.email,
    required this.tenantName,
  });

  final String name;
  final String email;
  final String tenantName;
}

/// Estado de la verificación en dos pasos (MFA). [method] es el factor que el
/// usuario tiene activo.
final class MfaStatus {
  const MfaStatus({required this.enabled, this.method});

  final bool enabled;
  final MfaFactor? method;
}

/// Passkey registrada por el usuario.
final class Passkey {
  const Passkey({
    required this.id,
    required this.name,
    required this.createdAt,
  });

  final String id;
  final String name;
  final DateTime createdAt;
}

/// Resumen de seguridad: MFA y passkeys.
final class SecurityOverview {
  const SecurityOverview({required this.mfa, required this.passkeys});

  final MfaStatus mfa;
  final List<Passkey> passkeys;
}

/// Acuerdo pendiente o aceptado. [acceptedAt] se llena al aceptarlo.
final class Agreement {
  const Agreement({
    required this.id,
    required this.title,
    required this.version,
    required this.required,
    this.graceUntil,
    this.acceptedAt,
  });

  final String id;
  final String title;
  final String version;
  final bool required;
  final DateTime? graceUntil;
  final DateTime? acceptedAt;

  Agreement markAccepted(DateTime at) => Agreement(
    id: id,
    title: title,
    version: version,
    required: required,
    graceUntil: graceUntil,
    acceptedAt: at,
  );
}

/// El acuerdo que se intentó aceptar no está pendiente.
final class AgreementNotPendingException implements Exception {
  const AgreementNotPendingException(this.agreementId);

  final String agreementId;

  @override
  String toString() => 'El acuerdo $agreementId no está pendiente.';
}
