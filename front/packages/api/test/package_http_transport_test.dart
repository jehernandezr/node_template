import 'dart:async';
import 'dart:convert';

import 'package:api/api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

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

  test('a connection failure throws TransportException', () async {
    final transport = PackageHttpTransport(
      client: MockClient((_) async => throw http.ClientException('refused')),
    );

    await expectLater(
      transport.send(
        TransportRequest(
          method: 'GET',
          uri: Uri.parse('https://api.example.com/v1/me/access'),
        ),
      ),
      throwsA(
        isA<TransportException>().having(
          (e) => e.failure,
          'failure',
          TransportFailure.connection,
        ),
      ),
    );
  });

  test('an answer slower than the timeout throws TransportException', () async {
    final never = Completer<http.Response>();
    final transport = PackageHttpTransport(
      client: MockClient((_) => never.future),
      timeout: const Duration(milliseconds: 10),
    );

    await expectLater(
      transport.send(
        TransportRequest(
          method: 'GET',
          uri: Uri.parse('https://api.example.com/v1/me/access'),
        ),
      ),
      throwsA(
        isA<TransportException>().having(
          (e) => e.failure,
          'failure',
          TransportFailure.timeout,
        ),
      ),
    );
  });

  test('a programming error is not wrapped', () async {
    final transport = PackageHttpTransport(
      client: MockClient((_) async => throw StateError('bug')),
    );

    await expectLater(
      transport.send(
        TransportRequest(
          method: 'GET',
          uri: Uri.parse('https://api.example.com/v1/me/access'),
        ),
      ),
      throwsA(isA<StateError>()),
    );
  });
}
