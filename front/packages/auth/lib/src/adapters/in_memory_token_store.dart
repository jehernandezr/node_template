import '../ports.dart';

/// [TokenStore] that keeps the session token only in memory.
///
/// It is the mobile shell's store until the Keychain and Keystore adapter
/// exists: the session survives navigation, but not an app restart,
/// which asks for login again.
final class InMemoryTokenStore implements TokenStore {
  String? _sessionToken;

  @override
  bool get sessionInCookie => false;

  @override
  Future<String?> readSessionToken() async => _sessionToken;

  @override
  Future<void> writeSessionToken(String sessionToken) async {
    _sessionToken = sessionToken;
  }

  @override
  Future<void> clear() async {
    _sessionToken = null;
  }
}
