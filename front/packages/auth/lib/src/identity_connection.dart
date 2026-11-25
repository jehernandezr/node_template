import 'dart:async';
import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import 'api_auth_repository.dart';
import 'ports.dart';
import 'session_manager.dart';
import 'session_transport.dart';

/// Loads the access of the current session.
typedef SessionAccessLoader = Future<SessionAccess> Function();

/// Real connection of a shell to identity.
///
/// Joins the [SessionManager], the [ApiClient] that signs with its access
/// token and refreshes the session on a code in [refreshCodes], and the
/// session access ([access], from `GET /v1/me/access`): permissions, platform
/// roles, features, flags and last MFA. The shell turns [access] into its
/// `UserSession`.
///
/// [access] reloads after every refresh (permissions may have changed) and
/// goes back to null when the session ends, either through [signOut] or
/// because the server invalidated it: on refresh or on any authenticated
/// route that answers with an invalidation code (session revoked, expired or
/// reused, token revoked, user or tenant suspended).
final class IdentityConnection {
  /// Creates a connection over [transport] and [baseUri].
  ///
  /// The connection owns [transport] and closes it in [dispose].
  ///
  /// The sign-in, refresh and sign-out routes use an [ApiClient] without a
  /// token and declare the [SessionTransport] that matches [tokenStore]
  /// (cookie on the web, bearer in the native app); the rest, including the
  /// step-up, use [apiClient], which takes the token from [sessionManager] and
  /// notifies it when the API rejects that token with an invalidation code.
  factory IdentityConnection({
    required HttpTransport transport,
    required Uri baseUri,
    required TokenStore tokenStore,
    DeviceKeyPort? deviceKeys,
    Map<String, String> defaultHeaders = const {},
  }) {
    // The session client and the SessionManager depend on each other.
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

  /// Creates a connection from its parts.
  ///
  /// Closes [transport] in [dispose] when given.
  IdentityConnection.withParts({
    required this.sessionManager,
    required this.apiClient,
    required this._loadAccess,
    this._transport,
  }) {
    _lastState = sessionManager.state;
    _states = sessionManager.states.listen(_onState);
  }

  /// Codes with which an authenticated route asks to refresh the session and
  /// retry once.
  ///
  /// `IDENTITY.TOKEN.STALE_PERMISSIONS` comes with a valid token whose
  /// permissions changed. `PLATFORM.AUTH.TOKEN_EXPIRED` comes with an expired
  /// access token: the refresh replaces the token but does not end the
  /// session, so it is not in the invalidation list.
  static final Set<String> refreshCodes = {
    IdentityErrorCode.tokenStalePermissions.code,
    PlatformErrorCode.authTokenExpired.code,
  };

  /// Session and tokens.
  final SessionManager sessionManager;

  /// API client with the session.
  ///
  /// Shells pass it to the microfrontends in `ShellServices`.
  final ApiClient apiClient;

  final SessionAccessLoader _loadAccess;
  final HttpTransport? _transport;
  late final StreamSubscription<AuthState> _states;
  bool _disposed = false;
  late AuthState _lastState;
  Future<SessionAccess>? _inFlight;

  /// Generation counter that increments on every sign-out, to discard loads
  /// that finish afterwards.
  int _generation = 0;

  /// Access of the open session, or null without a session.
  ValueListenable<SessionAccess?> get access => _access;
  final ValueNotifier<SessionAccess?> _access = ValueNotifier(null);

  /// Restores the stored session and loads its access.
  ///
  /// Returns whether the session ended up open. Throws the errors that are not
  /// authentication errors, such as a network failure.
  Future<bool> restore() async {
    if (!await sessionManager.restore()) return false;
    await reloadAccess();
    return true;
  }

  /// Loads the session access and publishes it in [access].
  ///
  /// Overlapping calls share the same request. If the session ends meanwhile,
  /// the result is discarded. Throws the API errors.
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

  /// Signs out on the server and locally.
  Future<void> signOut() => sessionManager.logout();

  /// Publishes in [access] the `mfaVerifiedAt` of a verified step-up (the one
  /// from `SessionManager.verifyStepUp`).
  ///
  /// Does nothing without a session. It is separate from the verification so
  /// the step-up page decides when the shell session changes: it first closes
  /// the page and then publishes, because the router recomputes on that
  /// change.
  void markMfaVerified(DateTime at) {
    final current = _access.value;
    if (current == null || sessionManager.state == AuthState.signedOut) return;
    // Through JSON, so a field the contract adds later is not lost.
    _access.value = SessionAccess.fromJson({
      ...current.toJson(),
      'mfaVerifiedAt': at.toUtc().toIso8601String(),
    });
  }

  /// Releases the in-memory session and closes the transport.
  ///
  /// Calling it again does nothing.
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
      // A refresh may bring new permissions. If the load fails because of the
      // network or the API, the previous access is kept and the next refresh
      // tries again; a programming error propagates to the zone.
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

/// Handles the rejection of an access token.
typedef RejectedTokenHandler = Future<bool> Function(
  String accessToken,
  String code,
);

/// [HttpTransport] that inspects the error responses of requests with an
/// access token and notifies [onRejected] with the token and the problem code.
///
/// This way `SessionManager.handleRejectedToken` ends the session when any
/// authenticated route answers with an invalidation code, even if a
/// microfrontend makes the call. The response passes unchanged to
/// `ApiClient`, which turns it into an `ApiErrorException`.
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
      // Not a problem document: there is no code to inspect.
    }
    return null;
  }
}
