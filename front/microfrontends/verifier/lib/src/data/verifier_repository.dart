import 'login_challenge.dart';

/// Source of login challenges for this device.
///
/// The screen depends only on this interface. The fake implementation lives in
/// `fake_verifier_repository.dart`; the real one will talk to the API and the
/// device key store.
abstract interface class VerifierRepository {
  /// Emits the pending challenge, or null when there is none.
  ///
  /// A new subscriber receives the current state first. This stream stands in
  /// for a push notification.
  Stream<LoginChallenge?> pending();

  /// Rejects the attempt identified by [challengeId] ("No fui yo").
  ///
  /// The server cancels the code and sends security alerts.
  Future<void> deny(String challengeId);

  /// Returns the 8-digit code this device generates for [challengeId] by
  /// signing the challenge with its key.
  Future<String> autoCode(String challengeId);

  /// Releases the resources held by the repository. The scope that owns it
  /// calls this when the identity changes.
  void close();
}
