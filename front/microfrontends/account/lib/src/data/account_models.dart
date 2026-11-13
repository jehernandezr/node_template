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

/// Sesión activa del usuario en un dispositivo.
final class AppSession {
  const AppSession({
    required this.id,
    required this.deviceName,
    required this.platform,
    required this.lastSeen,
    this.isCurrent = false,
  });

  final String id;
  final String deviceName;
  final String platform;
  final DateTime lastSeen;
  final bool isCurrent;
}

/// Dispositivo con confianza vigente. El verificador es el dispositivo
/// registrado para aprobar acciones sensibles.
final class TrustedDevice {
  const TrustedDevice({
    required this.id,
    required this.name,
    required this.platform,
    required this.lastSeen,
    this.trustedUntil,
    this.isVerifier = false,
  });

  final String id;
  final String name;
  final String platform;
  final DateTime lastSeen;
  final DateTime? trustedUntil;
  final bool isVerifier;
}

/// Estado de la verificación en dos pasos (MFA).
final class MfaStatus {
  const MfaStatus({required this.enabled, this.method});

  final bool enabled;
  final String? method;
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
