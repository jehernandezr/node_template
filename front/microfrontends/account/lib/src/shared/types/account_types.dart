import 'package:contracts/contracts.dart' show MfaFactor;

/// Profile of the signed-in user.
final class AccountProfile {
  /// Profile of the signed-in user.
  const AccountProfile({
    required this.name,
    required this.email,
    required this.tenantName,
  });

  /// Display name.
  final String name;

  /// Email address.
  final String email;

  /// Name of the current organization.
  final String tenantName;
}

/// Two-step verification (MFA) status. [method] is the factor the user has
/// enabled.
final class MfaStatus {
  /// Second factor status: whether it is [enabled] and with which [method].
  const MfaStatus({required this.enabled, this.method});

  /// Whether a second factor is enabled.
  final bool enabled;

  /// Method in use, if any.
  final MfaFactor? method;
}

/// Passkey registered by the user.
final class Passkey {
  /// Passkey of the user.
  const Passkey({
    required this.id,
    required this.name,
    required this.createdAt,
  });

  /// Id of the passkey.
  final String id;

  /// Name the user gave it.
  final String name;

  /// When it was registered.
  final DateTime createdAt;
}

/// Security summary: MFA and passkeys.
final class SecurityOverview {
  /// Second factor and passkeys of the user.
  const SecurityOverview({required this.mfa, required this.passkeys});

  /// Second factor status.
  final MfaStatus mfa;

  /// Registered passkeys.
  final List<Passkey> passkeys;
}

/// Pending or accepted agreement. [acceptedAt] is set on acceptance.
final class Agreement {
  /// Agreement the user must or did accept.
  const Agreement({
    required this.id,
    required this.title,
    required this.version,
    required this.required,
    this.graceUntil,
    this.acceptedAt,
  });

  /// Id of the agreement.
  final String id;

  /// Title shown to the user.
  final String title;

  /// Version of the text.
  final String version;

  /// Whether it must be accepted to keep using the app.
  final bool required;

  /// Until when it may stay unaccepted, if it has a grace period.
  final DateTime? graceUntil;

  /// When it was accepted, or `null` while pending.
  final DateTime? acceptedAt;

  /// Copies the agreement as accepted [at] that instant.
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
  /// Thrown when [agreementId] is not pending.
  const AgreementNotPendingException(this.agreementId);

  /// Id of the agreement.
  final String agreementId;

  @override
  String toString() => 'Agreement $agreementId is not pending.';
}

/// The agreements the user still has to accept and the ones already accepted.
final class AgreementsOverview {
  /// Pending and accepted agreements.
  const AgreementsOverview({required this.pending, required this.accepted});

  /// Agreements still to accept.
  final List<Agreement> pending;

  /// Agreements already accepted.
  final List<Agreement> accepted;
}
