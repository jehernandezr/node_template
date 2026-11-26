import 'package:contracts/contracts.dart' show DeviceSummary, SessionSummary;
import 'package:shell_core/shell_core.dart';

import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';

/// Access to the account data.
///
/// Sessions and devices have an `identity` contract and every repository
/// serves them. The rest (profile, device trust, security, agreements)
/// depends on [capabilities]: a repository without a capability throws
/// [UnsupportedError] from its operations, and the screens do not offer them.
abstract interface class AccountRepository implements ScopedResource {
  /// Capabilities this repository actually serves.
  Set<AccountCapability> get capabilities;

  /// Loads the name, email and organization of the user.
  Future<AccountProfile> loadProfile();

  /// Active sessions, the current one included.
  Future<List<SessionSummary>> listSessions();

  /// Closes a remote session.
  Future<void> revokeSession(String sessionId);

  /// Closes every session but the current one. Returns how many it closed.
  Future<int> revokeOtherSessions();

  /// Lists the devices of the user.
  Future<List<DeviceSummary>> listDevices();

  /// Withdraws the trust of a device.
  Future<void> removeDeviceTrust(String deviceId);

  /// Loads the second factor and passkeys of the user.
  Future<SecurityOverview> loadSecurity();

  /// Registers a new passkey.
  Future<void> addPasskey();

  /// Generates new recovery codes; the previous ones stop working.
  Future<List<String>> regenerateRecoveryCodes();

  /// Lists the agreements the user still has to accept.
  Future<List<Agreement>> listPendingAgreements();

  /// Lists the agreements the user already accepted.
  Future<List<Agreement>> listAcceptedAgreements();

  /// Accepts the agreement [agreementId].
  Future<void> acceptAgreement(String agreementId);
}
