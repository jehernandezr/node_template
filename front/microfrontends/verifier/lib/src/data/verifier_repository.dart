import 'package:shell_core/shell_core.dart';

import '../shared/types/login_challenge.dart';

/// Source of login challenges for this device.
///
/// The screen depends only on this interface. The fake implementation lives in
/// `fake_verifier_repository.dart`. There is no backend contract for login
/// challenges yet, so there is no real implementation: when `package:contracts`
/// exposes the operations, it will use `ApiClient`. The scope that owns the
/// repository calls `dispose` when the identity changes.
abstract interface class VerifierRepository implements ScopedResource {
  /// Emits the pending challenge, or null when there is none.
  ///
  /// A new subscriber receives the current state first. This stream stands in
  /// for a push notification.
  Stream<LoginChallenge?> pending();

  /// Rejects the attempt identified by [challengeId] ("No fui yo").
  ///
  /// The server cancels the code and sends security alerts.
  Future<void> deny(String challengeId);

  /// Returns the code this device generates for [challengeId] by signing the
  /// challenge with its key.
  Future<String> autoCode(String challengeId);
}
