// Los campos privados se inicializan en la lista de inicializadores a propósito:
// el constructor recibe nombres públicos sin guion bajo.
// ignore_for_file: prefer_initializing_formals

import 'dart:async';
import 'dart:convert';

import 'package:contracts/contracts.dart';

import 'auth_errors.dart';
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
/// Habla con identity a través de [AuthRepository] con los tipos del
/// contrato: [signIn], [requestMfaChallenge] y [verifyMfa] siguen el flujo de
/// tres pasos del plan.
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
  /// [SessionTokens.accessExpiresAt].
  final Duration refreshLead;

  /// Códigos de identity que cierran la sesión cuando los devuelve el refresh
  /// o, con [handleRejectedToken], cualquier ruta autenticada.
  /// `PLATFORM.AUTH.UNAUTHENTICATED` la cierra siempre que lo devuelve el
  /// refresh.
  final Set<IdentityErrorCode> invalidationCodes;

  final _states = StreamController<AuthState>.broadcast();
  AuthState _state = AuthState.signedOut;
  SessionTokens? _tokens;
  String? _sessionToken;
  Future<SessionTokens>? _inFlightRefresh;

  /// Incrementa en cada cierre local para descartar operaciones que terminen
  /// después de un logout.
  int _generation = 0;

  /// Cola de operaciones sobre [_store], para aplicarlas en orden.
  Future<void> _storeQueue = Future<void>.value();

  AuthState get state => _state;

  /// Si [verifyMfa] puede registrar este dispositivo, porque hay un
  /// [DeviceKeyPort].
  bool get canRegisterDevice => _deviceKeys != null;

  /// Cambios de estado. Solo emite cuando el estado cambia.
  Stream<AuthState> get states => _states.stream;

  /// Recupera la sesión al arrancar la app con un refresh.
  ///
  /// Lee el session token guardado (en web, la cookie viaja sola) y pide un
  /// access token nuevo. Devuelve true si la sesión quedó abierta y false si no
  /// había sesión o el servidor la rechazó (un código de [invalidationCodes] o
  /// `PLATFORM.AUTH.UNAUTHENTICATED`). Lanza los demás errores, como un fallo
  /// de red; el session token se conserva para intentarlo de nuevo.
  Future<bool> restore() async {
    final generation = _generation;
    final stored = await _serialized(_store.readSessionToken);
    if (generation != _generation) return false;
    if (stored == null && !_store.sessionInCookie) return false;
    _sessionToken = stored;
    try {
      await _refresh();
      return true;
    } on SignedOutException {
      return false;
    } on ApiErrorException catch (error) {
      if (_endsSession(error)) return false;
      rethrow;
    }
  }

  /// Primer paso del login: email y contraseña.
  ///
  /// Si la respuesta trae tokens, guarda la sesión. Si trae `PendingMfa`, el
  /// siguiente paso es [requestMfaChallenge]. Lanza [SignedOutException] si
  /// hubo un [logout] mientras tanto.
  Future<SignInResponse> signIn(SignInRequest request) async {
    final generation = _generation;
    final response = await _repository.signIn(request);
    await _adoptResponse(response, generation: generation);
    return response;
  }

  /// Segundo paso: crea el desafío MFA de [mfaToken] con [method] y envía el
  /// código. No cambia la sesión.
  Future<MfaChallenge> requestMfaChallenge({
    required String mfaToken,
    required MfaFactor method,
  }) => _repository.requestMfaChallenge(
    MfaChallengeRequest(mfaToken: mfaToken, method: method),
  );

  /// Tercer paso: verifica [code] para el desafío [challengeId] y guarda la
  /// sesión. Con [registerDevice] envía la clave pública del dispositivo en
  /// base64url, como pide el contrato.
  ///
  /// Lanza [SignedOutException] si hubo un [logout] mientras tanto.
  Future<SignInResponse> verifyMfa({
    required String mfaToken,
    required String challengeId,
    required String code,
    bool registerDevice = false,
  }) async {
    final generation = _generation;
    String? publicKey;
    if (registerDevice) {
      final keys = _deviceKeys;
      if (keys == null) {
        throw StateError('registerDevice requiere un DeviceKeyPort');
      }
      publicKey = base64Url.encode(await keys.publicKey()).replaceAll('=', '');
    }
    final response = await _repository.verifyMfa(
      MfaVerifyRequest(
        mfaToken: mfaToken,
        challengeId: challengeId,
        code: code,
        devicePublicKey: publicKey,
      ),
    );
    await _adoptResponse(response, generation: generation);
    return response;
  }

  /// Devuelve un access token vigente, o null si no hay sesión. Refresca si
  /// vence dentro de [refreshLead].
  ///
  /// Es el `accessToken` de `ApiClient`: sin sesión, el cliente responde
  /// `PLATFORM.AUTH.UNAUTHENTICATED` sin llamar a la red. Lanza
  /// [ApiErrorException] si el refresh falla en el servidor (y cierra la
  /// sesión si el código la invalida) y [SignedOutException] si un [logout]
  /// llegó durante el refresh.
  Future<String?> accessToken() async {
    final current = _tokens;
    if (current == null) return null;
    if (_clock().isBefore(current.accessExpiresAt.subtract(refreshLead))) {
      return current.accessToken;
    }
    return (await _refresh()).accessToken;
  }

  /// Fuerza un refresh aunque el access token siga vigente, por ejemplo cuando
  /// la API responde `IDENTITY.TOKEN.STALE_PERMISSIONS` (es el
  /// `onStalePermissions` de `ApiClient`). Comparte el refresh en vuelo.
  ///
  /// Lanza [SignedOutException] si no hay sesión y [ApiErrorException] si el
  /// refresh falla en el servidor.
  Future<void> refresh() async {
    if (_tokens == null) throw const SignedOutException();
    await _refresh();
  }

  /// Revoca la sesión en el servidor y borra los tokens locales, aunque el
  /// servidor falle.
  ///
  /// Envía el session token guardado (en web viaja la cookie). Sin session
  /// token ni cookie no hay nada que revocar y solo se cierra la sesión local.
  Future<void> logout() async {
    try {
      // Se lee fuera de la cola del almacén: esperar detrás de una escritura
      // pendiente dejaría que esa escritura abriera la sesión antes del cierre.
      final sessionToken = _sessionToken ?? await _store.readSessionToken();
      if (sessionToken != null || _store.sessionInCookie) {
        await _repository.logout(sessionToken: sessionToken);
      }
    } finally {
      await _clearLocal();
    }
  }

  /// Primer paso del paso adicional (step-up) de la sesión abierta: devuelve
  /// el `mfaToken` y los métodos que ofrece el servidor.
  ///
  /// Lanza [SignedOutException] sin sesión.
  Future<PendingMfa> startStepUp() {
    if (_tokens == null) throw const SignedOutException();
    return _repository.startStepUp();
  }

  /// Segundo paso: crea el desafío del paso adicional con [method] y envía
  /// el código. No cambia la sesión.
  Future<MfaChallenge> requestStepUpChallenge({
    required String mfaToken,
    required MfaFactor method,
  }) {
    if (_tokens == null) throw const SignedOutException();
    return _repository.requestStepUpChallenge(
      MfaChallengeRequest(mfaToken: mfaToken, method: method),
    );
  }

  /// Tercer paso: verifica [code] y adopta el access token nuevo, que lleva
  /// el segundo factor recién verificado. Devuelve el resultado con el nuevo
  /// `mfaVerifiedAt` de la sesión; el session token no cambia.
  ///
  /// Espera antes un refresh en vuelo, para que su token no reemplace después
  /// al del paso adicional. Lanza [SignedOutException] sin sesión o si hubo un
  /// [logout] mientras tanto.
  Future<StepUpResult> verifyStepUp({
    required String mfaToken,
    required String challengeId,
    required String code,
  }) async {
    if (_tokens == null) throw const SignedOutException();
    final inFlight = _inFlightRefresh;
    if (inFlight != null) {
      await inFlight.then<void>((_) {}, onError: (Object _) {});
    }
    final generation = _generation;
    if (_tokens == null) throw const SignedOutException();
    final result = await _repository.verifyStepUp(
      StepUpVerifyRequest(
        mfaToken: mfaToken,
        challengeId: challengeId,
        code: code,
      ),
    );
    await _adopt(result.tokens, generation: generation);
    return result;
  }

  /// Cierra la sesión local cuando la API rechazó [accessToken] con un código
  /// de [invalidationCodes] (sesión revocada, token revocado, usuario o tenant
  /// suspendido) en cualquier ruta autenticada. Devuelve si la cerró.
  ///
  /// Solo actúa si [accessToken] sigue siendo el de la sesión: una respuesta
  /// tardía a un token viejo no cierra una sesión nueva ni una ya refrescada.
  Future<bool> handleRejectedToken({
    required String accessToken,
    required String code,
  }) async {
    final identity = IdentityErrorCode.fromCode(code);
    if (identity == null || !invalidationCodes.contains(identity)) {
      return false;
    }
    if (_tokens?.accessToken != accessToken) return false;
    await _clearLocal();
    return true;
  }

  Future<void> dispose() => _states.close();

  /// Un solo refresh en vuelo: los llamados concurrentes reciben el mismo resultado.
  Future<SessionTokens> _refresh() {
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

  Future<SessionTokens> _doRefresh() async {
    final generation = _generation;
    _setState(AuthState.refreshing);
    try {
      final fresh = await _repository.refresh(sessionToken: _sessionToken);
      await _adopt(fresh, generation: generation);
      return fresh;
    } catch (error) {
      // Tras un logout el estado ya es signedOut y no se toca.
      if (generation == _generation) {
        if (error is ApiErrorException && _endsSession(error)) {
          await _clearLocal();
        } else {
          _setState(_tokens == null ? AuthState.signedOut : AuthState.signedIn);
        }
      }
      rethrow;
    }
  }

  /// Si el servidor dice que la sesión ya no existe.
  bool _endsSession(ApiErrorException error) {
    final code = error.problem.code;
    final identity = IdentityErrorCode.fromCode(code);
    return (identity != null && invalidationCodes.contains(identity)) ||
        PlatformErrorCode.fromCode(code) ==
            PlatformErrorCode.authUnauthenticated;
  }

  /// Adopta los tokens de [response] cuando el login quedó completo.
  Future<void> _adoptResponse(
    SignInResponse response, {
    required int generation,
  }) async {
    final tokens = response.tokens;
    if (response.status == SignInStatus.authenticated && tokens != null) {
      await _adopt(tokens, generation: generation);
    }
  }

  /// Guarda el session token de [tokens] y abre la sesión, salvo que un
  /// logout haya cambiado [_generation] desde [generation].
  ///
  /// La comprobación se repite después de escribir: si el logout llegó
  /// mientras la escritura estaba pendiente, su borrado está detrás en la cola
  /// del almacén y deja el almacén vacío, y aquí no se toca ni la memoria ni el
  /// estado.
  Future<void> _adopt(SessionTokens tokens, {required int generation}) async {
    if (generation != _generation) {
      throw const SignedOutException();
    }
    final sessionToken = tokens.sessionToken;
    if (sessionToken != null) {
      await _serialized(() => _store.writeSessionToken(sessionToken));
      if (generation != _generation) {
        throw const SignedOutException();
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
