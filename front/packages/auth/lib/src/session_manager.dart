import 'dart:async';
import 'dart:convert';

import 'package:contracts/contracts.dart';
import 'package:utils/utils.dart';

import 'auth_errors.dart';
import 'ports.dart';

/// Whether there is a session and whether it is being refreshed.
enum AuthState {
  /// There is no session.
  signedOut,

  /// There is a valid session.
  signedIn,

  /// The session is being refreshed.
  refreshing,
}

/// Maintains the session: stores the session token, refreshes the access token before
/// it expires and closes the session when the server invalidates it.
///
/// The access token lives only in memory. The [TokenStore] stores only the
/// session token, and [restore] obtains a new access token with a refresh.
///
/// Talks to identity through [AuthRepository] with the contract
/// types: [signIn], [requestMfaChallenge] and [verifyMfa] are the three steps
/// of login from a new device (ADR 0006).
///
/// A [logout] cancels everything in progress: a login, an MFA verification
/// or a refresh that finishes afterwards does not reopen the session. Store writes and
/// deletes are applied in the order they are requested, so the
/// delete of a logout always wins over a write that started earlier.
class SessionManager {
  /// Manager over the auth repository, its token store and clock.
  SessionManager({
    required this._repository,
    required this._tokenStore,
    this._deviceKeys,
    this._clock = systemClock,
    this.refreshLead = const Duration(minutes: 2),
    this.invalidationCodes = defaultInvalidationCodes,
  });

  final AuthRepository _repository;
  final TokenStore _tokenStore;
  final DeviceKeyPort? _deviceKeys;
  final Clock _clock;

  /// Lead time with which the access token is refreshed before
  /// [SessionTokens.accessExpiresAt].
  final Duration refreshLead;

  /// Identity codes that close the session when returned by the refresh
  /// or, with [handleRejectedToken], by any authenticated route.
  /// `PLATFORM.AUTH.UNAUTHENTICATED` always closes it when returned by the
  /// refresh.
  final Set<IdentityErrorCode> invalidationCodes;

  final _states = StreamController<AuthState>.broadcast();
  AuthState _state = AuthState.signedOut;
  SessionTokens? _tokens;
  String? _sessionToken;
  Future<SessionTokens>? _inFlightRefresh;

  /// Incremented on each local sign-out to discard operations that finish
  /// after a logout.
  int _generation = 0;

  /// Queue of operations on [_tokenStore], to apply them in order.
  Future<void> _storeQueue = Future<void>.value();

  /// Current state of the session.
  AuthState get state => _state;

  /// Whether [verifyMfa] can register this device, because there is a
  /// [DeviceKeyPort].
  bool get canRegisterDevice => _deviceKeys != null;

  /// State changes. Only emits when the state changes.
  Stream<AuthState> get states => _states.stream;

  /// Restores the session on app startup with a refresh.
  ///
  /// Reads the stored session token (on web, the cookie travels on its own) and requests a
  /// new access token. Returns true if the session ended up open and false if there
  /// was no session or the server rejected it (a code from [invalidationCodes] or
  /// `PLATFORM.AUTH.UNAUTHENTICATED`). Throws the other errors, such as a network
  /// failure; the session token is kept to try again.
  Future<bool> restore() async {
    final generation = _generation;
    final stored = await _serialized(_tokenStore.readSessionToken);
    if (generation != _generation) return false;
    if (stored == null && !_tokenStore.sessionInCookie) return false;
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

  /// First login step: email and password.
  ///
  /// If the response has tokens, stores the session. If it has `PendingMfa`, the
  /// next step is [requestMfaChallenge]. Throws [SignedOutException] if
  /// there was a [logout] in the meantime.
  Future<SignInResponse> signIn(SignInRequest request) async {
    final generation = _generation;
    final response = await _repository.signIn(request);
    await _adoptResponse(response, generation: generation);
    return response;
  }

  /// Second step: creates the MFA challenge of [mfaToken] with [method] and sends the
  /// code. Does not change the session.
  Future<MfaChallenge> requestMfaChallenge({
    required String mfaToken,
    required MfaFactor method,
  }) => _repository.requestMfaChallenge(
    MfaChallengeRequest(mfaToken: mfaToken, method: method),
  );

  /// Third step: verifies [code] for the challenge [challengeId] and stores the
  /// session. With [registerDevice] sends the device public key in
  /// base64url, as the contract requires.
  ///
  /// Throws [SignedOutException] if there was a [logout] in the meantime.
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
        throw StateError('registerDevice requires a DeviceKeyPort');
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

  /// Returns a valid access token, or null if there is no session. Refreshes if
  /// it expires within [refreshLead].
  ///
  /// It is the `accessToken` of `ApiClient`: without a session, the client responds
  /// `PLATFORM.AUTH.UNAUTHENTICATED` without calling the network. Throws
  /// [ApiErrorException] if the refresh fails on the server (and closes the
  /// session if the code invalidates it) and [SignedOutException] if a [logout]
  /// arrived during the refresh.
  Future<String?> accessToken() async {
    final current = _tokens;
    if (current == null) return null;
    if (_clock().isBefore(current.accessExpiresAt.subtract(refreshLead))) {
      return current.accessToken;
    }
    return (await _refresh()).accessToken;
  }

  /// Forces a refresh even if the access token is still valid, for example when
  /// the API responds `IDENTITY.TOKEN.STALE_PERMISSIONS` or
  /// `PLATFORM.AUTH.TOKEN_EXPIRED` (it is the `sessionRefresh` of `ApiClient`, which
  /// retries the route once). Shares the in-flight refresh.
  ///
  /// Throws [SignedOutException] if there is no session and [ApiErrorException] if the
  /// refresh fails on the server.
  Future<void> refresh() async {
    if (_tokens == null) throw const SignedOutException();
    await _refresh();
  }

  /// Revokes the session on the server and deletes the local tokens, even if the
  /// server fails.
  ///
  /// Sends the stored session token (on web the cookie travels). Without a session
  /// token or cookie there is nothing to revoke and only the local session is closed.
  ///
  /// Read outside the store queue: waiting behind a pending write would let that write open the session before the sign-out.
  Future<void> logout() async {
    try {
      final sessionToken =
          _sessionToken ?? await _tokenStore.readSessionToken();
      if (sessionToken != null || _tokenStore.sessionInCookie) {
        await _repository.logout(sessionToken: sessionToken);
      }
    } finally {
      await _clearLocal();
    }
  }

  /// First step of the step-up of the open session: returns
  /// the `mfaToken` and the methods the server offers.
  ///
  /// Throws [SignedOutException] without a session.
  Future<PendingMfa> startStepUp() {
    if (_tokens == null) throw const SignedOutException();
    return _repository.startStepUp();
  }

  /// Second step: creates the step-up challenge with [method] and sends
  /// the code. Does not change the session.
  Future<MfaChallenge> requestStepUpChallenge({
    required String mfaToken,
    required MfaFactor method,
  }) {
    if (_tokens == null) throw const SignedOutException();
    return _repository.requestStepUpChallenge(
      MfaChallengeRequest(mfaToken: mfaToken, method: method),
    );
  }

  /// Third step: verifies [code] and adopts the new access token, which carries
  /// the freshly verified second factor. Returns the result with the session's new
  /// `mfaVerifiedAt`; the session token does not change.
  ///
  /// First waits for an in-flight refresh, so its token does not later replace
  /// the step-up one. Throws [SignedOutException] without a session or if there was a
  /// [logout] in the meantime.
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

  /// Closes the local session when the API rejected [accessToken] with a code
  /// from [invalidationCodes] (revoked session, revoked token, suspended user or tenant)
  /// on any authenticated route. Returns whether it closed it.
  ///
  /// Only acts if [accessToken] is still the session's: a late response
  /// to an old token does not close a new session or an already refreshed one.
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

  /// Closes the stream of states.
  Future<void> dispose() => _states.close();

  /// A single in-flight refresh: concurrent calls receive the same result.
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

  /// After a logout the state is already signedOut and is not touched.
  ///
  /// Any other failure, including a programming error that passes through, returns the state the refresh found.
  Future<SessionTokens> _doRefresh() async {
    final generation = _generation;
    _setState(AuthState.refreshing);
    try {
      final fresh = await _repository.refresh(sessionToken: _sessionToken);
      await _adopt(fresh, generation: generation);
      return fresh;
    } on ApiErrorException catch (error) {
      if (generation == _generation && _endsSession(error)) {
        await _clearLocal();
      }
      rethrow;
    } finally {
      if (generation == _generation && _state == AuthState.refreshing) {
        _setState(_tokens == null ? AuthState.signedOut : AuthState.signedIn);
      }
    }
  }

  /// Whether the server says the session no longer exists.
  bool _endsSession(ApiErrorException error) {
    final code = error.problem.code;
    final identity = IdentityErrorCode.fromCode(code);
    return (identity != null && invalidationCodes.contains(identity)) ||
        PlatformErrorCode.fromCode(code) ==
            PlatformErrorCode.authUnauthenticated;
  }

  /// Adopts the tokens from [response] when the login is complete.
  Future<void> _adoptResponse(
    SignInResponse response, {
    required int generation,
  }) async {
    final tokens = response.tokens;
    if (response.status == SignInStatus.authenticated && tokens != null) {
      await _adopt(tokens, generation: generation);
    }
  }

  /// Stores the session token from [tokens] and opens the session, unless a
  /// logout changed [_generation] since [generation].
  ///
  /// The check is repeated after writing: if the logout arrived
  /// while the write was pending, its delete is behind in the store
  /// queue and leaves the store empty, and here neither memory nor
  /// state is touched.
  Future<void> _adopt(SessionTokens tokens, {required int generation}) async {
    if (generation != _generation) {
      throw const SignedOutException();
    }
    final sessionToken = tokens.sessionToken;
    if (sessionToken != null) {
      await _serialized(() => _tokenStore.writeSessionToken(sessionToken));
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
    await _serialized(_tokenStore.clear);
  }

  /// Runs [operation] on the store after the ones already requested.
  ///
  /// The queue continues even if an operation fails; the error reaches whoever requested it.
  Future<T> _serialized<T>(Future<T> Function() operation) {
    final result = _storeQueue.then((_) => operation());
    _storeQueue = result.then<void>((_) {}, onError: (Object _) {});
    return result;
  }

  void _setState(AuthState next) {
    if (next == _state) return;
    _state = next;
    if (!_states.isClosed) _states.add(next);
  }
}
