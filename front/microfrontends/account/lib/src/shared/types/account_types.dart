import 'package:contracts/contracts.dart' show MfaFactor;

/// Profile of the signed-in user.
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

/// Two-step verification (MFA) status. [method] is the factor the user has
/// enabled.
final class MfaStatus {
  const MfaStatus({required this.enabled, this.method});

  final bool enabled;
  final MfaFactor? method;
}

/// Passkey registered by the user.
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

/// Security summary: MFA and passkeys.
final class SecurityOverview {
  const SecurityOverview({required this.mfa, required this.passkeys});

  final MfaStatus mfa;
  final List<Passkey> passkeys;
}

/// Pending or accepted agreement. [acceptedAt] is set on acceptance.
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

/// The agreement being accepted is not pending.
final class AgreementNotPendingException implements Exception {
  const AgreementNotPendingException(this.agreementId);

  final String agreementId;

  @override
  String toString() => 'Agreement $agreementId is not pending.';
}

/// The agreements the user still has to accept and the ones already accepted.
final class AgreementsOverview {
  const AgreementsOverview({required this.pending, required this.accepted});

  final List<Agreement> pending;
  final List<Agreement> accepted;
}
