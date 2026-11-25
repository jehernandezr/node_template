import 'dart:async';
import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import 'api_auth_repository.dart';
import 'ports.dart';
import 'session_manager.dart';
import 'session_transport.dart';

/// Lee el acceso de la sesión actual.
typedef SessionAccessLoader = Future<SessionAccess> Function();

/// Conexión real de un shell con identity.
///
/// Reúne el [SessionManager], el [ApiClient] que firma con su access token y
/// refresca la sesión ante un código de [refreshCodes], y el acceso de
/// la sesión ([access], de `GET /v1/me/access`): permisos, roles de
/// plataforma, features, flags y último MFA. El shell convierte [access] en
/// su `UserSession`.
///
/// [access] se recarga después de cada refresh (los permisos pudieron
/// cambiar) y vuelve a null cuando la sesión se cierra, sea por un [signOut]
/// o porque el servidor la invalidó: en el refresh o en cualquier ruta
/// autenticada que responda un código de invalidación (sesión revocada,
/// vencida o reutilizada, token revocado, usuario o tenant suspendido).
final class IdentityConnection {
  /// Conexión sobre [transport] y [baseUri]. La conexión es dueña de
  /// [transport] y lo cierra en [dispose].
  ///
  /// Las rutas del login, el refresh y el cierre de sesión usan un
  /// [ApiClient] sin token y declaran el [SessionTransport] que corresponde a
  /// [tokenStore] (cookie en web, bearer en la app nativa); el resto (también el paso adicional),
  /// [apiClient], que toma el token de [sessionManager] y le avisa cuando la
  /// API rechaza ese token con un código de invalidación.
  factory IdentityConnection({
    required HttpTransport transport,
    required Uri baseUri,
    required TokenStore tokenStore,
    DeviceKeyPort? deviceKeys,
    Map<String, String> defaultHeaders = const {},
  }) {
    // El cliente con sesión y el SessionManager se necesitan entre sí.
    late final SessionManager sessionManager;
    final apiClient = ApiClient(
      transport: SessionInvalidationTransport(
        transport,
        onRejected: (accessToken, code) => sessionManager.handleRejectedToken(
          accessToken: accessToken,
          code: code,
        ),
      ),
      baseUri: baseUri,
      accessToken: () => sessionManager.accessToken(),
      sessionRefresh: SessionRefreshPolicy(
        appliesTo: (problem) => refreshCodes.contains(problem.code),
        refresh: () => sessionManager.refresh(),
      ),
      defaultHeaders: defaultHeaders,
    );
    sessionManager = SessionManager(
      repository: ApiAuthRepository(
        ApiClient(
          transport: transport,
          baseUri: baseUri,
          defaultHeaders: defaultHeaders,
        ),
        sessionTransport: SessionTransport.of(tokenStore),
        sessionClient: apiClient,
      ),
      tokenStore: tokenStore,
      deviceKeys: deviceKeys,
    );
    return IdentityConnection.withParts(
      sessionManager: sessionManager,
      apiClient: apiClient,
      loadAccess: () =>
          apiClient.send(IdentityRoutes.getSessionAccess, const Empty()),
      transport: transport,
    );
  }

  /// Conexión con sus piezas. Cierra [transport] en [dispose] cuando se da.
  IdentityConnection.withParts({
    required this.sessionManager,
    required this.apiClient,
    required this._loadAccess,
    this._transport,
  }) {
    _lastState = sessionManager.state;
    _states = sessionManager.states.listen(_onState);
  }

  /// Códigos con los que una ruta autenticada pide refrescar la sesión y
  /// reintentar una vez. `IDENTITY.TOKEN.STALE_PERMISSIONS` llega con un token
  /// válido cuyos permisos cambiaron. `PLATFORM.AUTH.TOKEN_EXPIRED` llega con
  /// un access token vencido: el refresh cambia el token, pero no cierra la
  /// sesión, así que no está en la lista de invalidación.
  static final Set<String> refreshCodes = {
    IdentityErrorCode.tokenStalePermissions.code,
    PlatformErrorCode.authTokenExpired.code,
  };

  /// Sesión y tokens.
  final SessionManager sessionManager;

  /// Cliente de la API con la sesión. Los shells lo pasan a los
  /// microfrontends en `ShellServices`.
  final ApiClient apiClient;

  final SessionAccessLoader _loadAccess;
  final HttpTransport? _transport;
  late final StreamSubscription<AuthState> _states;
  bool _disposed = false;
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

  /// Publica en [access] el `mfaVerifiedAt` de un paso adicional verificado
  /// (el de `SessionManager.verifyStepUp`). Sin sesión no hace nada.
  ///
  /// Va aparte de la verificación para que la página del paso adicional
  /// decida cuándo cambia la sesión del shell: primero cierra la página y
  /// después publica, porque el router se recalcula con ese cambio.
  void markMfaVerified(DateTime at) {
    final current = _access.value;
    if (current == null || sessionManager.state == AuthState.signedOut) return;
    // Por JSON, para no perder un campo que el contrato agregue después.
    _access.value = SessionAccess.fromJson({
      ...current.toJson(),
      'mfaVerifiedAt': at.toUtc().toIso8601String(),
    });
  }

  /// Suelta la sesión en memoria y cierra el transporte. Repetirlo no hace
  /// nada.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    await _states.cancel();
    _access.dispose();
    await sessionManager.dispose();
    _transport?.close();
  }

  void _onState(AuthState state) {
    final previous = _lastState;
    _lastState = state;
    if (state == AuthState.signedOut) {
      _generation++;
      _access.value = null;
    } else if (state == AuthState.signedIn &&
        previous == AuthState.refreshing) {
      // Un refresh pudo traer permisos nuevos. Si la carga falla por la red o
      // la API se conserva el acceso anterior y el siguiente refresh lo
      // intenta de nuevo; un error de programación sigue hasta la zona.
      unawaited(
        reloadAccess().then<void>(
          (_) {},
          onError: (Object error, StackTrace stack) {
            if (error is! Exception) Error.throwWithStackTrace(error, stack);
          },
        ),
      );
    }
  }
}

/// Avisa el rechazo de un access token.
typedef RejectedTokenHandler = Future<bool> Function(
  String accessToken,
  String code,
);

/// [HttpTransport] que mira las respuestas de error de las peticiones con
/// access token y avisa a [onRejected] con el token y el código del problema.
///
/// Así `SessionManager.handleRejectedToken` cierra la sesión cuando
/// cualquier ruta autenticada responde un código de invalidación, aunque la
/// llamada la haga un microfrontend. La respuesta sigue igual hacia
/// `ApiClient`, que la convierte en `ApiErrorException`.
final class SessionInvalidationTransport implements HttpTransport {
  SessionInvalidationTransport(this.inner, {required this.onRejected});

  final HttpTransport inner;
  final RejectedTokenHandler onRejected;

  static const _bearer = 'Bearer ';

  @override
  void close() => inner.close();

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    final response = await inner.send(request);
    final authorization = request.headers['authorization'];
    if (authorization == null ||
        !authorization.startsWith(_bearer) ||
        (response.statusCode >= 200 && response.statusCode <= 299)) {
      return response;
    }
    final code = _problemCode(response.body);
    if (code != null) {
      await onRejected(authorization.substring(_bearer.length), code);
    }
    return response;
  }

  static String? _problemCode(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic> && decoded['code'] is String) {
        return decoded['code'] as String;
      }
    } on FormatException {
      // No es un documento de problema: no hay código que mirar.
    }
    return null;
  }
}
