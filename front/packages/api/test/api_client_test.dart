import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

/// Transport that records requests and answers with [next].
class FakeTransport implements HttpTransport {
  FakeTransport([this.next = const TransportResponse(statusCode: 204)]);

  TransportResponse next;
  final List<TransportRequest> requests = [];

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    requests.add(request);
    return next;
  }
}

const _sessionId = '0193f1c2-0000-7000-8000-000000000000';

TransportResponse _json(int status, Object body) =>
    TransportResponse(statusCode: status, body: jsonEncode(body));

void main() {
  late FakeTransport transport;
  late ApiClient client;

  setUp(() {
    transport = FakeTransport();
    client = ApiClient(
      transport: transport,
      baseUri: Uri.parse('https://api.example.com/'),
      accessToken: () async => 'token-1',
    );
  });

  group('request validation', () {
    test('an invalid request never reaches the transport', () async {
      await expectLater(
        client.send(
          IdentityRoutes.signIn,
          const SignInRequest(email: 'not-an-email', password: ''),
        ),
        throwsA(
          isA<ContractViolationException>()
              .having((e) => e.routeId, 'routeId', 'identity.auth.sign-in')
              .having((e) => e.inResponse, 'inResponse', isFalse)
              .having(
                (e) => [for (final f in e.errors) (f.field, f.code)],
                'errors',
                [
                  ('email', PlatformErrorCode.validationInvalidFormat.code),
                  ('password', PlatformErrorCode.validationTooShort.code),
                ],
              ),
        ),
      );
      await expectLater(
        client.send(
          IdentityRoutes.revokeSession,
          const RevokeSessionRequest(sessionId: 'x'),
        ),
        throwsA(isA<ContractViolationException>()),
      );
      await expectLater(
        client.send(IdentityRoutes.listSessions, const PageQuery(limit: 0)),
        throwsA(isA<ContractViolationException>()),
      );
      expect(transport.requests, isEmpty);
    });
  });

  group('request encoding', () {
    test('POST sends the JSON body without auth on public routes', () async {
      transport.next = _json(200, {
        'status': 'authenticated',
        'tokens': {
          'accessToken': 'jwt',
          'accessExpiresAt': '2026-11-12T10:15:00.000Z',
        },
      });
      final response = await client.send(
        IdentityRoutes.signIn,
        const SignInRequest(email: 'ana@example.com', password: 'secret-value'),
      );
      expect(response.status, SignInStatus.authenticated);
      expect(
        response.tokens?.accessExpiresAt,
        DateTime.utc(2026, 11, 12, 10, 15),
      );

      final request = transport.requests.single;
      expect(request.method, 'POST');
      expect(request.uri.toString(), 'https://api.example.com/v1/auth/sign-in');
      expect(request.headers['content-type'], 'application/json');
      expect(request.headers.containsKey('authorization'), isFalse);
      expect(jsonDecode(request.body!), {
        'email': 'ana@example.com',
        'password': 'secret-value',
      });
    });

    test(
      'path params go in the path and authenticated routes send the token',
      () async {
        await client.send(
          IdentityRoutes.revokeSession,
          const RevokeSessionRequest(sessionId: _sessionId),
        );
        final request = transport.requests.single;
        expect(request.method, 'DELETE');
        expect(request.uri.path, '/v1/me/sessions/$_sessionId');
        expect(request.uri.query, isEmpty);
        expect(request.body, isNull);
        expect(request.headers['authorization'], 'Bearer token-1');
      },
    );

    test(
      'GET sends the other fields in the query and decodes the page',
      () async {
        transport.next = _json(200, {
          'items': [
            {
              'id': _sessionId,
              'deviceName': 'iPhone',
              'platform': 'ios',
              'lastSeenAt': '2026-11-12T10:00:00Z',
              'current': true,
            },
          ],
          'nextCursor': 'abc',
        });
        final page = await client.send(
          IdentityRoutes.listSessions,
          const PageQuery(limit: 10),
        );
        expect(page.items.single.platform, ClientPlatform.ios);
        expect(page.nextCursor, 'abc');
        expect(transport.requests.single.uri.queryParameters, {'limit': '10'});
      },
    );
  });

  group('responses', () {
    test('error answers become ApiErrorException with the problem', () async {
      transport.next = _json(400, {
        'type': 'https://docs.example.com/errors/IDENTITY.MFA.CODE_EXPIRED',
        'title': 'El código expiró',
        'status': 400,
        'code': 'IDENTITY.MFA.CODE_EXPIRED',
        'traceId': 'trace-1',
      });
      await expectLater(
        client.send(
          IdentityRoutes.verifyMfa,
          const MfaVerifyRequest(
            mfaToken: 't',
            challengeId: '0193f1c2-0000-7000-8000-000000000000',
            code: '12345678',
          ),
        ),
        throwsA(
          isA<ApiErrorException>()
              .having(
                (e) => e.problem.code,
                'code',
                IdentityErrorCode.mfaCodeExpired.code,
              )
              .having((e) => e.problem.traceId, 'traceId', 'trace-1'),
        ),
      );
    });

    test(
      'an error without a problem document becomes INTERNAL.UNEXPECTED',
      () async {
        transport.next = const TransportResponse(
          statusCode: 502,
          body: '<html>',
        );
        await expectLater(
          client.send(IdentityRoutes.revokeOtherSessions, const Empty()),
          throwsA(
            isA<ApiErrorException>()
                .having((e) => e.problem.status, 'status', 502)
                .having(
                  (e) => e.platformCode,
                  'platformCode',
                  PlatformErrorCode.internalUnexpected,
                ),
          ),
        );
      },
    );

    test(
      'a response that breaks the contract throws ContractViolationException',
      () async {
        transport.next = _json(200, {'revoked': -2});
        await expectLater(
          client.send(IdentityRoutes.revokeOtherSessions, const Empty()),
          throwsA(
            isA<ContractViolationException>()
                .having((e) => e.inResponse, 'inResponse', isTrue)
                .having((e) => e.errors.single.field, 'field', 'revoked'),
          ),
        );
        transport.next = const TransportResponse(
          statusCode: 200,
          body: 'not json',
        );
        await expectLater(
          client.send(IdentityRoutes.revokeOtherSessions, const Empty()),
          throwsA(isA<ContractViolationException>()),
        );
      },
    );

    test('a route without body returns normally on 204', () async {
      await client.send(
        IdentityRoutes.revokeSession,
        const RevokeSessionRequest(sessionId: _sessionId),
      );
      expect(transport.requests, hasLength(1));
    });
  });
}
