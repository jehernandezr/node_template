import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'http_client/client_io.dart'
    if (dart.library.js_interop) 'http_client/client_web.dart';
import 'http_transport.dart';

/// [HttpTransport] over `package:http`.
///
/// On the web it uses the browser client; with `withCredentials` the browser
/// sends the httpOnly session cookie to the API origin. HTTP errors come back
/// as responses; a connection failure or an answer that takes longer than
/// [timeout] throws [TransportException].
final class PackageHttpTransport implements HttpTransport {
  /// Transport over [client], or over the platform client when null.
  PackageHttpTransport({
    http.Client? client,
    bool withCredentials = false,
    this.timeout = defaultTimeout,
  }) : _client =
           client ?? createPlatformClient(withCredentials: withCredentials);

  /// Limit for the whole exchange, headers and body. Without one a hung
  /// request keeps a form busy and a shared token refresh pending forever.
  static const Duration defaultTimeout = Duration(seconds: 30);

  /// Time a request may take before it fails with
  /// [TransportFailure.timeout].
  final Duration timeout;

  final http.Client _client;

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    final outgoing = http.Request(request.method, request.uri)
      ..headers.addAll(request.headers);
    final body = request.body;
    if (body != null) outgoing.body = body;
    final http.Response response;
    try {
      response = await _exchange(outgoing).timeout(timeout);
    } on TimeoutException catch (error) {
      throw TransportException(
        TransportFailure.timeout,
        uri: request.uri,
        cause: error,
      );
    } on http.ClientException catch (error) {
      throw TransportException(
        TransportFailure.connection,
        uri: request.uri,
        cause: error,
      );
    }
    return TransportResponse(
      statusCode: response.statusCode,
      headers: {
        for (final entry in response.headers.entries)
          entry.key.toLowerCase(): entry.value,
      },
      // JSON is UTF-8 even when the response does not declare a charset.
      body: utf8.decode(response.bodyBytes, allowMalformed: true),
    );
  }

  Future<http.Response> _exchange(http.Request outgoing) async =>
      http.Response.fromStream(await _client.send(outgoing));

  @override
  void close() => _client.close();
}
