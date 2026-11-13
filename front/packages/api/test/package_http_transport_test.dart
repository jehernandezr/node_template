import 'dart:convert';

import 'package:api/api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('sends method, headers and body, and returns the answer', () async {
    late http.Request seen;
    final transport = PackageHttpTransport(
      client: MockClient((request) async {
        seen = request;
        return http.Response.bytes(
          utf8.encode('{"name":"Sesión"}'),
          201,
          headers: {'Content-Type': 'application/json'},
        );
      }),
    );

    final response = await transport.send(
      TransportRequest(
        method: 'POST',
        uri: Uri.parse('https://api.example.com/v1/auth/sign-in'),
        headers: const {'content-type': 'application/json'},
        body: '{"email":"ana@example.com"}',
      ),
    );

    expect(seen.method, 'POST');
    expect(seen.url.path, '/v1/auth/sign-in');
    expect(seen.body, '{"email":"ana@example.com"}');
    expect(response.statusCode, 201);
    expect(response.headers['content-type'], 'application/json');
    // UTF-8 even without a charset in the content type.
    expect(response.body, '{"name":"Sesión"}');
  });

  test('HTTP errors come back as responses', () async {
    final transport = PackageHttpTransport(
      client: MockClient((_) async => http.Response('{}', 401)),
    );

    final response = await transport.send(
      TransportRequest(
        method: 'GET',
        uri: Uri.parse('https://api.example.com/v1/me/access'),
      ),
    );

    expect(response.statusCode, 401);
  });
}
