// Los campos privados se inicializan en la lista de inicializadores a propósito:
// el constructor recibe nombres públicos sin guion bajo.
// ignore_for_file: prefer_initializing_formals

import 'dart:async';

import 'models.dart';
import 'ports.dart';

/// Estado observable de la sesión.
enum AuthState { signedOut, signedIn, refreshing }

/// Fuente de tiempo inyectable para pruebas.
typedef Clock = DateTime Function();

/// Mantiene la sesión: guarda el session token, refresca el access token antes
/// de que venza y cierra la sesión cuando el servidor la invalida.
///
/// El access token vive solo en memoria. El [TokenStore] guarda únicamente el
/// session token, y [restore] obtiene un access token nuevo con un refresh.
///
/// Un [logout] anula todo lo que esté en curso: un login, una verificación MFA
/// o un refresh que termine después no reabre la sesión. Las escrituras y
/// borrados del almacén se aplican en el orden en que se piden, así que el
/// borrado de un logout siempre gana a una escritura que empezó antes.
class SessionManager {
  SessionManager({
    required AuthRepository repository,
    required TokenStore tokenStore,
    DeviceKeyPort? deviceKeys,
    Clock? clock,
    this.refreshLead = const Duration(minutes: 2),
    this.invalidationCodes = defaultInvalidationCodes,
  }) : _repository = repository,
       _store = tokenStore,
       _deviceKeys = deviceKeys,
       _clock = clock ?? DateTime.now;

  final AuthRepository _repository;
  final TokenStore _store;
  final DeviceKeyPort? _deviceKeys;
  final Clock _clock;

  /// Antelación con la que se refresca el access token antes de
  /// [AuthTokens.accessExpiresAt].
  final Duration refreshLead;

  /// Códigos de error del refresh que cierran la sesión.
  final Set<String> invalidationCodes;

  final _states = StreamController<AuthState>.broadcast();
  AuthState _state = AuthState.signedOut;
  AuthTokens? _tokens;
  String? _sessionToken;
  Future<AuthTokens>? _inFlightRefresh;

  /// Incrementa en cada cierre local para descartar operaciones que terminen
  /// después de un logout.
  int _generation = 0;

  /// Cola de operaciones sobre [_store], para aplicarlas en orden.
  Future<void> _storeQueue = Future<void>.value();

  AuthState get state => _state;

  /// Cambios de estado. Solo emite cuando el estado cambia.
  Stream<AuthState> get states => _states.stream;

  /// Recupera la sesión al arrancar la app con un refresh.
  ///
  /// Lee el session token guardado (en web, la cookie viaja sola) y pide un
  /// access token nuevo. Devuelve true si la sesión quedó abierta y false si no
  /// había sesión o el servidor la rechazó. Lanza los errores que no son de
  /// autenticación, como un fallo de red; el session token se conserva para
  /// intentarlo de nuevo.
  Future<bool> restore() async {
    final generation = _generation;
    final stored = await _serialized(_store.readSessionToken);
    if (generation != _generation) return false;
    if (stored == null && !_store.sessionInCookie) return false;
    _sessionToken = stored;
    try {
      await _refresh();
      return true;
    } on AuthException {
      return false;
    }
  }

  /// Login con email y contraseña. Si el resultado es [LoginSucceeded], guarda la sesión.
  ///
  /// Lanza [AuthException] con [signedOutErrorCode] si hubo un [logout]
  /// mientras tanto.
  Future<LoginResult> login(
    String email,
    String password, {
    String? deviceId,
  }) async {
    final generation = _generation;
    final result = await _repository.login(email, password, deviceId: deviceId);
    if (result is LoginSucceeded) {
      await _adopt(result.tokens, generation: generation);
    }
    return result;
  }

  /// Verifica el desafío MFA. Con [registerDevice] envía la clave pública del dispositivo.
  ///
  /// Lanza [AuthException] con [signedOutErrorCode] si hubo un [logout]
  /// mientras tanto.
  Future<LoginResult> verifyMfa(
    String mfaToken,
    MfaMethod method,
    String code, {
    bool registerDevice = false,
  }) async {
    final generation = _generation;
    List<int>? publicKey;
    if (registerDevice) {
      final keys = _deviceKeys;
      if (keys == null) {
        throw StateError('registerDevice requiere un DeviceKeyPort');
      }
      publicKey = await keys.publicKey();
    }
    final result = await _repository.verifyMfa(
      mfaToken,
      method,
      code,
      devicePublicKey: publicKey,
    );
    if (result is LoginSucceeded) {
      await _adopt(result.tokens, generation: generation);
    }
    return result;
  }

  /// Devuelve un access token vigente. Refresca si vence dentro de [refreshLead].
  ///
  /// Lanza [AuthException] si no hay sesión o si el refresh la invalida.
  Future<String> accessToken() async {
    final current = _tokens;
    if (current == null) throw const AuthException(signedOutErrorCode);
    if (_clock().isBefore(current.accessExpiresAt.subtract(refreshLead))) {
      return current.accessToken;
    }
    return (await _refresh()).accessToken;
  }

  /// Fuerza un refresh aunque el access token siga vigente, por ejemplo cuando
  /// la API responde `IDENTITY.TOKEN.STALE_PERMISSIONS` (es el
  /// `onStalePermissions` de `ApiClient`). Comparte el refresh en vuelo.
  ///
  /// Lanza [AuthException] si no hay sesión o si el refresh la invalida.
  Future<void> refresh() async {
    if (_tokens == null) throw const AuthException(signedOutErrorCode);
    await _refresh();
  }

  /// Revoca la sesión en el servidor y borra los tokens locales, aunque el servidor falle.
  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      await _clearLocal();
    }
  }

  Future<void> dispose() => _states.close();

  /// Un solo refresh en vuelo: los llamados concurrentes reciben el mismo resultado.
  Future<AuthTokens> _refresh() {
    final inFlight = _inFlightRefresh;
    if (inFlight != null) return inFlight;
    final future = _doRefresh();
    _inFlightRefresh = future;
    future.then<void>(
      (_) => _inFlightRefresh = null,
      onError: (_) => _inFlightRefresh = null,
    );
    return future;
  }

  Future<AuthTokens> _doRefresh() async {
    final generation = _generation;
    _setState(AuthState.refreshing);
    try {
      final fresh = await _repository.refresh(sessionToken: _sessionToken);
      await _adopt(fresh, generation: generation);
      return fresh;
    } catch (error) {
      // Tras un logout el estado ya es signedOut y no se toca.
      if (generation == _generation) {
        if (error is AuthException && invalidationCodes.contains(error.code)) {
          await _clearLocal();
        } else {
          _setState(_tokens == null ? AuthState.signedOut : AuthState.signedIn);
        }
      }
      rethrow;
    }
  }

  /// Guarda el session token de [tokens] y abre la sesión, salvo que un
  /// logout haya cambiado [_generation] desde [generation].
  ///
  /// La comprobación se repite después de escribir: si el logout llegó
  /// mientras la escritura estaba pendiente, su borrado está detrás en la cola
  /// del almacén y deja el almacén vacío, y aquí no se toca ni la memoria ni el
  /// estado.
  Future<void> _adopt(AuthTokens tokens, {required int generation}) async {
    if (generation != _generation) {
      throw const AuthException(signedOutErrorCode);
    }
    final sessionToken = tokens.sessionToken;
    if (sessionToken != null) {
      await _serialized(() => _store.writeSessionToken(sessionToken));
      if (generation != _generation) {
        throw const AuthException(signedOutErrorCode);
      }
      _sessionToken = sessionToken;
    }
    _tokens = tokens;
    _setState(AuthState.signedIn);
  }

  Future<void> _clearLocal() async {
    _generation++;
    _tokens = null;
    _sessionToken = null;
    _setState(AuthState.signedOut);
    await _serialized(_store.clear);
  }

  /// Ejecuta [operation] sobre el almacén después de las ya pedidas.
  Future<T> _serialized<T>(Future<T> Function() operation) {
    final result = _storeQueue.then((_) => operation());
    // La cola sigue aunque una operación falle; el error le llega a quien la pidió.
    _storeQueue = result.then<void>((_) {}, onError: (Object _) {});
    return result;
  }

  void _setState(AuthState next) {
    if (next == _state) return;
    _state = next;
    if (!_states.isClosed) _states.add(next);
  }
}
