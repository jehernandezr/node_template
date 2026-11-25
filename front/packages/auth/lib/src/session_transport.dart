import 'ports.dart';

/// How the session token travels between a shell and identity.
///
/// identity tells a browser from a native app by the headers of each session
/// request. Without a declaration it treats the client as a browser: it moves
/// the session token from the body to an httpOnly cookie, which a
/// `package:http` client on a device drops, so the first refresh fails.
enum SessionTransport {
  /// A browser: the session token lives in the httpOnly cookie that the
  /// browser sends with credentials.
  cookie({}),

  /// A native app: the session token travels in the body, and every session
  /// request declares `x-session-transport: bearer`.
  bearer({'x-session-transport': 'bearer'});

  const SessionTransport(this.headers);

  /// Headers that declare this transport on each sign-in, MFA verification,
  /// refresh and sign-out request.
  final Map<String, String> headers;

  /// The transport that matches [store]: [cookie] when the session token
  /// lives in a cookie the store cannot see, [bearer] otherwise.
  static SessionTransport of(TokenStore store) =>
      store.sessionInCookie ? cookie : bearer;
}
