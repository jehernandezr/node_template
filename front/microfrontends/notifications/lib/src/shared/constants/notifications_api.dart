/// How the notifications microfrontend talks to its API.
abstract final class NotificationsApi {
  /// Server-sent events of the user. It lives outside the contract, like
  /// `/health`, because it is not a request and response.
  static const String streamPath = '/v1/notifications/stream';

  /// Notifications the inbox shows: the largest page the contract allows.
  static const int inboxPageSize = 100;

  /// Wait before the first reconnection of the stream, until the server
  /// sends its own `retry`.
  static const Duration reconnectDelay = Duration(seconds: 3);

  /// Longest wait between reconnections while the stream keeps failing.
  static const Duration maxReconnectDelay = Duration(minutes: 1);

  /// Frame ids remembered to drop the ones a reconnection sends again.
  static const int rememberedFrames = 256;

  /// Zone of the quiet hours of a new account, until the server says another.
  static const String defaultTimezone = 'UTC';
}
