import 'package:api/api.dart';
import 'package:auth/auth.dart';

/// Builds the real identity connection of a shell, or none in demo mode.
final class IdentityConnectionFactory {
  /// Factory of the identity connection of each shell mode.
  const IdentityConnectionFactory({
    required this.baseUrl,
    required this.transport,
    required this.tokenStore,
  });

  /// API origin. Empty means demo mode.
  final String baseUrl;

  /// Called once per connection; the connection owns the result.
  final HttpTransport Function() transport;

  /// Called once per connection.
  final TokenStore Function() tokenStore;

  /// Null when [baseUrl] is empty.
  IdentityConnection? create() => baseUrl.isEmpty
      ? null
      : IdentityConnection(
          transport: transport(),
          baseUri: Uri.parse(baseUrl),
          tokenStore: tokenStore(),
        );
}
