import 'package:meta/meta.dart';

/// HTTP request built by [ApiClient] for the transport.
@immutable
final class TransportRequest {
  const TransportRequest({
    required this.method,
    required this.uri,
    this.headers = const {},
    this.body,
  });

  /// HTTP method, for example `POST`.
  final String method;
  final Uri uri;
  final Map<String, String> headers;

  /// JSON body, or null when the request has none.
  final String? body;
}

/// HTTP response returned by the transport.
@immutable
final class TransportResponse {
  const TransportResponse({
    required this.statusCode,
    this.headers = const {},
    this.body = '',
  });

  final int statusCode;

  /// Headers with lower-case names.
  final Map<String, String> headers;
  final String body;
}

/// Port to the network. The app injects an adapter over `package:http`,
/// `dio` or the browser; tests inject a fake.
abstract interface class HttpTransport {
  /// Sends [request]. Throws only for network failures, never for HTTP errors.
  Future<TransportResponse> send(TransportRequest request);
}
