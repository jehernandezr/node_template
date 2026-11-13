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

/// Códigos que invalidan la sesión de forma definitiva cuando el refresh los devuelve.
/// Son supuestos a partir de la sección "Identidad"; pueden sobreescribirse en el constructor.
const defaultInvalidationCodes = <String>{
  'IDENTITY.SESSION.REVOKED',
  'IDENTITY.SESSION.REUSED',
  'IDENTITY.TOKEN.REVOKED',
  'IDENTITY.USER.SUSPENDED',
  'IDENTITY.TENANT.SUSPENDED',
};

/// Código de [AuthException] cuando no hay sesión activa.
const signedOutErrorCode = 'AUTH.SIGNED_OUT';

/// Guarda los tokens, refresca el access token antes de que venza y cierra la
/// sesión cuando el servidor la invalida.
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

  /// Antelación con la que se refresca el access token antes de [AuthTokens.accessExpiresAt].
  final Duration refreshLead;

  /// Códigos de error del refresh que cierran la sesión.
  final Set<String> invalidationCodes;

  final _states = StreamController<AuthState>.broadcast();
  AuthState _state = AuthState.signedOut;
  AuthTokens? _tokens;
  Future<AuthTokens>? _inFlightRefresh;

  /// Incrementa en cada cierre local para descartar refresh que terminen después de un logout.
  int _generation = 0;

  AuthState get state => _state;

  /// Cambios de estado. Solo emite cuando el estado cambia.
  Stream<AuthState> get states => _states.stream;

  /// Carga los tokens guardados al arrancar la app.
  Future<void> restore() async {
    final stored = await _store.read();
    if (stored == null) return;
    _tokens = stored;
    _setState(AuthState.signedIn);
  }

  /// Login con email y contraseña. Si el resultado es [LoginSucceeded], guarda la sesión.
  Future<LoginResult> login(
    String email,
    String password, {
    String? deviceId,
  }) async {
    final result = await _repository.login(email, password, deviceId: deviceId);
    if (result is LoginSucceeded) await _adopt(result.tokens);
    return result;
  }

  /// Verifica el desafío MFA. Con [registerDevice] envía la clave pública del dispositivo.
  Future<LoginResult> verifyMfa(
    String mfaToken,
    MfaMethod method,
    String code, {
    bool registerDevice = false,
  }) async {
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
    if (result is LoginSucceeded) await _adopt(result.tokens);
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
      final fresh = await _repository.refresh();
      if (generation != _generation) {
        // Hubo logout mientras se refrescaba: no se reanima la sesión.
        throw const AuthException(signedOutErrorCode);
      }
      await _adopt(fresh);
      return fresh;
    } catch (error) {
      if (error is AuthException && invalidationCodes.contains(error.code)) {
        await _clearLocal();
      } else {
        _setState(_tokens == null ? AuthState.signedOut : AuthState.signedIn);
      }
      rethrow;
    }
  }

  Future<void> _adopt(AuthTokens tokens) async {
    await _store.write(tokens);
    _tokens = tokens;
    _setState(AuthState.signedIn);
  }

  Future<void> _clearLocal() async {
    _generation++;
    _tokens = null;
    await _store.clear();
    _setState(AuthState.signedOut);
  }

  void _setState(AuthState next) {
    if (next == _state) return;
    _state = next;
    if (!_states.isClosed) _states.add(next);
  }
}
