import 'package:meta/meta.dart';

/// HTTP request built by [ApiClient] for the transport.
@immutable
final class TransportRequest {
  /// Request to [uri] with [headers] and an optional body.
  const TransportRequest({
    required this.method,
    required this.uri,
    this.headers = const {},
    this.body,
  });

  /// HTTP method, for example `POST`.
  final String method;

  /// Destination of the request.
  final Uri uri;

  /// Headers of the request.
  final Map<String, String> headers;

  /// JSON body, or null when the request has none.
  final String? body;
}

/// HTTP response returned by the transport.
@immutable
final class TransportResponse {
  /// Response with [statusCode], [body] and headers.
  const TransportResponse({
    required this.statusCode,
    this.headers = const {},
    this.body = '',
  });

  /// HTTP status of the response.
  final int statusCode;

  /// Headers with lower-case names.
  final Map<String, String> headers;

  /// Body of the response as text.
  final String body;
}

/// Why a request never got an HTTP answer.
enum TransportFailure {
  /// No answer within the transport's time limit.
  timeout,

  /// The connection failed: no network, DNS, TLS, refused or reset.
  connection,
}

/// A request that never got an HTTP answer.
///
/// Callers tell a network problem (retry later, show a generic message) from
/// a bug by this type: a [TypeError] or a [StateError] is never wrapped.
final class TransportException implements Exception {
  /// Failure of kind [failure] while calling [uri], with the [cause] that produced it.
  const TransportException(this.failure, {required this.uri, this.cause});

  /// Kind of transport failure.
  final TransportFailure failure;

  /// Target of the failed request.
  final Uri uri;

  /// Original error of the HTTP client, kept for logs.
  final Object? cause;

  @override
  String toString() => 'TransportException(${failure.name}, $uri)';
}

/// Port to the network. The app injects an adapter over `package:http` or
/// the browser; tests inject a fake.
abstract interface class HttpTransport {
  /// Sends [request]. HTTP errors come back as responses; a request without
  /// an answer throws [TransportException].
  Future<TransportResponse> send(TransportRequest request);

  /// Releases the connections. The owner calls it once, when it goes away.
  void close();
}
