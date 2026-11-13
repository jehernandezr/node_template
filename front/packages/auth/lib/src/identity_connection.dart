// El constructor recibe `loadAccess` sin guion bajo y lo guarda en un campo
// privado.
// ignore_for_file: prefer_initializing_formals

import 'dart:async';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import 'api_auth_repository.dart';
import 'ports.dart';
import 'session_manager.dart';

/// Lee el acceso de la sesión actual.
typedef SessionAccessLoader = Future<SessionAccess> Function();

/// Conexión real de un shell con identity.
///
/// Reúne el [SessionManager], el [ApiClient] que firma con su access token y
/// refresca la sesión ante `IDENTITY.TOKEN.STALE_PERMISSIONS`, y el acceso de
/// la sesión ([access], de `GET /v1/me/access`): permisos, roles de
/// plataforma, features, flags y último MFA. El shell convierte [access] en
/// su `UserSession`.
///
/// [access] se recarga después de cada refresh (los permisos pudieron
/// cambiar) y vuelve a null cuando la sesión se cierra, sea por un [signOut]
/// o porque el servidor la invalidó.
final class IdentityConnection {
  /// Conexión sobre [transport] y [baseUri].
  ///
  /// Las rutas del login usan un [ApiClient] sin token; el resto,
  /// [apiClient], que toma el token de [sessionManager].
  factory IdentityConnection({
    required HttpTransport transport,
    required Uri baseUri,
    required TokenStore tokenStore,
    DeviceKeyPort? deviceKeys,
    Map<String, String> defaultHeaders = const {},
  }) {
    final sessionManager = SessionManager(
      repository: ApiAuthRepository(
        ApiClient(
          transport: transport,
          baseUri: baseUri,
          defaultHeaders: defaultHeaders,
        ),
      ),
      tokenStore: tokenStore,
      deviceKeys: deviceKeys,
    );
    final apiClient = ApiClient(
      transport: transport,
      baseUri: baseUri,
      accessToken: sessionManager.accessToken,
      onStalePermissions: sessionManager.refresh,
      defaultHeaders: defaultHeaders,
    );
    return IdentityConnection.withParts(
      sessionManager: sessionManager,
      apiClient: apiClient,
      loadAccess: () =>
          apiClient.send(IdentityRoutes.getSessionAccess, const Empty()),
    );
  }

  /// Conexión con sus piezas, para pruebas.
  IdentityConnection.withParts({
    required this.sessionManager,
    required this.apiClient,
    required SessionAccessLoader loadAccess,
  }) : _loadAccess = loadAccess {
    _lastState = sessionManager.state;
    _states = sessionManager.states.listen(_onState);
  }

  /// Sesión y tokens.
  final SessionManager sessionManager;

  /// Cliente de la API con la sesión. Los shells lo pasan a los
  /// microfrontends en `ShellServices`.
  final ApiClient apiClient;

  final SessionAccessLoader _loadAccess;
  late final StreamSubscription<AuthState> _states;
  late AuthState _lastState;
  Future<SessionAccess>? _inFlight;

  /// Sube con cada cierre de sesión, para descartar cargas que terminen
  /// después.
  int _generation = 0;

  /// Acceso de la sesión abierta, o null sin sesión.
  ValueListenable<SessionAccess?> get access => _access;
  final ValueNotifier<SessionAccess?> _access = ValueNotifier(null);

  /// Recupera la sesión guardada y carga su acceso. Devuelve si quedó abierta.
  ///
  /// Lanza los errores que no son de autenticación, como un fallo de red.
  Future<bool> restore() async {
    if (!await sessionManager.restore()) return false;
    await reloadAccess();
    return true;
  }

  /// Carga el acceso de la sesión y lo publica en [access].
  ///
  /// Las llamadas que coinciden comparten la misma petición. Si la sesión se
  /// cierra mientras tanto, el resultado se descarta. Lanza los errores de la
  /// API.
  Future<SessionAccess> reloadAccess() {
    final inFlight = _inFlight;
    if (inFlight != null) return inFlight;
    final generation = _generation;
    final future = _loadAccess().then((loaded) {
      if (generation == _generation &&
          sessionManager.state != AuthState.signedOut) {
        _access.value = loaded;
      }
      return loaded;
    });
    _inFlight = future;
    future.then<void>(
      (_) => _inFlight = null,
      onError: (Object _) => _inFlight = null,
    );
    return future;
  }

  /// Cierra la sesión en el servidor y localmente.
  Future<void> signOut() => sessionManager.logout();

  Future<void> dispose() async {
    await _states.cancel();
    _access.dispose();
    await sessionManager.dispose();
  }

  void _onState(AuthState state) {
    final previous = _lastState;
    _lastState = state;
    if (state == AuthState.signedOut) {
      _generation++;
      _access.value = null;
    } else if (state == AuthState.signedIn &&
        previous == AuthState.refreshing) {
      // Un refresh pudo traer permisos nuevos. Si la carga falla se conserva
      // el acceso anterior; el siguiente refresh lo intenta de nuevo.
      unawaited(reloadAccess().then<void>((_) {}, onError: (Object _) {}));
    }
  }
}
