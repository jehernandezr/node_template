import '../ports.dart';

/// [TokenStore] que guarda el session token solo en memoria.
///
/// Es el almacén del shell móvil mientras no exista el adaptador de Keychain
/// y Keystore: la sesión sobrevive a la navegación, pero no a un reinicio de
/// la app, que vuelve a pedir el login.
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
