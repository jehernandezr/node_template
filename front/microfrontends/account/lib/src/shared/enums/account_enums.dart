/// Account sections. [segment] is the route segment under `/account`; the
/// overview has none.
enum AccountSection {
  /// The account overview.
  overview(''),

  /// The open sessions.
  sessions('sessions'),

  /// The devices of the user.
  devices('devices'),

  /// Second factor and passkeys.
  security('security'),

  /// The agreements of the user.
  agreements('agreements');

  const AccountSection(this.segment);

  /// Route segment, empty for [overview].
  final String segment;
}

/// Account parts that depend on the repository serving them. Sessions and
/// devices (listing and revoking sessions) have a contract and are always
/// there; the rest only where the operation exists.
enum AccountCapability {
  /// Name, email and organization.
  profile,

  /// Withdrawing the trust of a device.
  deviceTrust,

  /// Second factor, passkeys and recovery codes.
  security,

  /// Pending and accepted agreements.
  agreements,
}

/// Operations of the account repository. The demo repository tags each call
/// with one so a test can make a single operation fail.
enum AccountOperation {
  /// Loading the profile.
  loadProfile,

  /// Listing the sessions.
  listSessions,

  /// Revoking one session.
  revokeSession,

  /// Revoking every other session.
  revokeOtherSessions,

  /// Listing the devices.
  listDevices,

  /// Withdrawing the trust of a device.
  removeDeviceTrust,

  /// Loading the security settings.
  loadSecurity,

  /// Adding a passkey.
  addPasskey,

  /// Regenerating the recovery codes.
  regenerateRecoveryCodes,

  /// Listing the pending agreements.
  listPendingAgreements,

  /// Listing the accepted agreements.
  listAcceptedAgreements,

  /// Accepting an agreement.
  acceptAgreement,
}
