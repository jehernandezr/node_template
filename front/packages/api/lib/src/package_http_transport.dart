import 'dart:convert';

import 'package:http/http.dart' as http;

import 'http_client/client_io.dart'
    if (dart.library.js_interop) 'http_client/client_web.dart';
import 'http_transport.dart';

/// [HttpTransport] over `package:http`.
///
/// On the web it uses the browser client; with `withCredentials` the browser
/// sends the httpOnly session cookie to the API origin. Network failures
/// throw `http.ClientException`; HTTP errors come back as responses.
final class PackageHttpTransport implements HttpTransport {
  /// Transport over [client], or over the platform client when null.
  PackageHttpTransport({http.Client? client, bool withCredentials = false})
    : _client =
          client ?? createPlatformClient(withCredentials: withCredentials);

  final http.Client _client;

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    final outgoing = http.Request(request.method, request.uri)
      ..headers.addAll(request.headers);
    final body = request.body;
    if (body != null) outgoing.body = body;
    final response = await http.Response.fromStream(
      await _client.send(outgoing),
    );
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

  /// Closes the underlying client.
  void close() => _client.close();
}
