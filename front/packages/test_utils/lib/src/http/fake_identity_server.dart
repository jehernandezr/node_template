import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:utils/utils.dart';

/// How a client reaches identity, as the backend's `ClientChannelResolver`
/// decides it from the request headers.
enum FakeClientChannel {
  /// A browser: the session token travels in the httpOnly cookie.
  web,

  /// A native app: the session token travels in the body or the bearer.
  native,
}

/// [HttpTransport] that plays identity's sign-in, refresh and sign-out with
/// the backend's channel rule, so a session test fails the way the real
/// server would make it fail.
///
/// A request is [FakeClientChannel.native] when it carries
/// `x-session-transport: bearer` or a session token (`st1_...`) as bearer;
/// any other request is [FakeClientChannel.web]. On the web the session token
/// never reaches the body: it goes to the cookie, which only survives when
/// [keepsCookies] is true, as with a browser that sends credentials. A
/// `package:http` client on a device drops it.
///
/// Refresh and sign-out read the session token from the body, then from a
/// session bearer and, on the web, from the cookie. An unknown or missing one
/// answers `PLATFORM.AUTH.UNAUTHENTICATED`. Any other route answers 503.
final class FakeIdentityServer implements HttpTransport {
  /// A server whose clients keep the session cookie when [keepsCookies].
  ///
  /// Access tokens expire 15 minutes after the time `clock` reads at issue.
  FakeIdentityServer({required this.keepsCookies, this._clock = systemClock});

  /// Whether the client sends back the cookie the server sets.
  final bool keepsCookies;

  final Clock _clock;

  /// Requests in the order they were sent.
  final List<TransportRequest> requests = [];

  /// Session tokens revoked by a sign-out, in order.
  final List<String> revokedSessions = [];

  /// Whether [close] ran.
  bool isClosed = false;

  final Set<String> _liveSessions = {};
  String? _cookie;
  int _issued = 0;

  static const _sessionPrefix = 'st1_';
  static const _bearer = 'Bearer ';
  static const _transportHeader = 'x-session-transport';
  static const _bearerTransport = 'bearer';
  static const _accessLifetime = Duration(minutes: 15);
  static final Set<String> _sessionPaths = {
    IdentityRoutes.signIn.path,
    IdentityRoutes.refreshSession.path,
    IdentityRoutes.signOut.path,
  };

  /// The channel the backend resolves for [request].
  static FakeClientChannel channelOf(TransportRequest request) {
    final declared = request.headers[_transportHeader]?.toLowerCase();
    return declared == _bearerTransport || _sessionBearer(request) != null
        ? FakeClientChannel.native
        : FakeClientChannel.web;
  }

  /// Whether [sessionToken] is open on the server.
  bool isLive(String sessionToken) => _liveSessions.contains(sessionToken);

  /// Channels of the sign-in, refresh and sign-out requests, in order.
  List<FakeClientChannel> get sessionChannels => [
    for (final request in requests)
      if (_sessionPaths.contains(request.uri.path)) channelOf(request),
  ];

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    requests.add(request);
    final path = request.uri.path;
    if (path == IdentityRoutes.signIn.path) return _signIn(request);
    if (path == IdentityRoutes.refreshSession.path) return _refresh(request);
    if (path == IdentityRoutes.signOut.path) return _signOut(request);
    return const TransportResponse(statusCode: 503);
  }

  @override
  void close() => isClosed = true;

  TransportResponse _signIn(TransportRequest request) => _json(
    SignInResponse(
      status: SignInStatus.authenticated,
      tokens: _deliver(_open(), request),
    ).toJson(),
  );

  TransportResponse _refresh(TransportRequest request) {
    final current = _sessionOf(request);
    if (current == null || !_liveSessions.remove(current)) {
      return _unauthenticated();
    }
    return _json(_deliver(_open(), request).toJson());
  }

  TransportResponse _signOut(TransportRequest request) {
    final current = _sessionOf(request);
    if (current == null || !_liveSessions.remove(current)) {
      return _unauthenticated();
    }
    revokedSessions.add(current);
    if (channelOf(request) == FakeClientChannel.web) _cookie = null;
    return const TransportResponse(statusCode: 204);
  }

  String _open() {
    final sessionToken = '$_sessionPrefix${++_issued}';
    _liveSessions.add(sessionToken);
    return sessionToken;
  }

  SessionTokens _deliver(String sessionToken, TransportRequest request) {
    final native = channelOf(request) == FakeClientChannel.native;
    if (!native && keepsCookies) _cookie = sessionToken;
    return SessionTokens(
      accessToken: 'access-$_issued',
      accessExpiresAt: _clock().add(_accessLifetime),
      sessionToken: native ? sessionToken : null,
    );
  }

  String? _sessionOf(TransportRequest request) {
    final body = request.body;
    final fromBody = body == null
        ? null
        : (jsonDecode(body) as Map<String, dynamic>)['sessionToken'] as String?;
    return fromBody ??
        _sessionBearer(request) ??
        (channelOf(request) == FakeClientChannel.web ? _cookie : null);
  }

  static String? _sessionBearer(TransportRequest request) {
    final authorization = request.headers['authorization'];
    if (authorization == null || !authorization.startsWith(_bearer)) {
      return null;
    }
    final token = authorization.substring(_bearer.length);
    return token.startsWith(_sessionPrefix) ? token : null;
  }

  static TransportResponse _json(Map<String, dynamic> body) =>
      TransportResponse(
        statusCode: 200,
        headers: const {'content-type': 'application/json'},
        body: jsonEncode(body),
      );

  static TransportResponse _unauthenticated() {
    final code = PlatformErrorCode.authUnauthenticated;
    return TransportResponse(
      statusCode: code.httpStatus,
      headers: const {'content-type': 'application/problem+json'},
      body: jsonEncode(
        ProblemDetails(
          type: 'about:blank',
          title: 'Unauthenticated',
          status: code.httpStatus,
          code: code.code,
        ).toJson(),
      ),
    );
  }
}
