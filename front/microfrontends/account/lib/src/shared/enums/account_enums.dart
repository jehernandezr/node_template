/// Account sections. [segment] is the route segment under `/account`; the
/// overview has none.
enum AccountSection {
  overview(''),
  sessions('sessions'),
  devices('devices'),
  security('security'),
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
  loadProfile,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  listDevices,
  removeDeviceTrust,
  loadSecurity,
  addPasskey,
  regenerateRecoveryCodes,
  listPendingAgreements,
  listAcceptedAgreements,
  acceptAgreement,
}
