import 'dart:convert';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

/// Transporte que guarda las peticiones y responde con [queue] en orden.
class _Transport implements HttpTransport {
  final List<TransportResponse> queue = [];
  final List<TransportRequest> requests = [];

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    requests.add(request);
    return queue.removeAt(0);
  }
}

TransportResponse _json(int status, Object body) =>
    TransportResponse(statusCode: status, body: jsonEncode(body));

const _challengeId = '0193f1c2-0000-7000-8000-000000000001';

void main() {
  late _Transport transport;
  late ApiAuthRepository repository;

  setUp(() {
    transport = _Transport();
    repository = ApiAuthRepository(
      ApiClient(
        transport: transport,
        baseUri: Uri.parse('https://api.example.com'),
      ),
    );
  });

  test('signIn posts the request and decodes a pending MFA', () async {
    transport.queue.add(
      _json(200, {
        'status': 'mfa_required',
        'mfa': {
          'mfaToken': 'mfa-1',
          'methods': ['device_otp', 'email_otp'],
        },
      }),
    );

    final response = await repository.signIn(
      const SignInRequest(email: 'ana@example.com', password: 'secret'),
    );

    expect(response.status, SignInStatus.mfaRequired);
    expect(response.mfa?.methods, [MfaFactor.deviceOtp, MfaFactor.emailOtp]);
    final request = transport.requests.single;
    expect(request.method, 'POST');
    expect(request.uri.path, '/v1/auth/sign-in');
    expect(request.headers.containsKey('authorization'), isFalse);
  });

  test('an invalid sign-in request never reaches the network', () async {
    await expectLater(
      repository.signIn(
        const SignInRequest(email: 'not-an-email', password: 'secret'),
      ),
      throwsA(isA<ContractViolationException>()),
    );
    expect(transport.requests, isEmpty);
  });

  test('requestMfaChallenge posts to the challenges route', () async {
    transport.queue.add(
      _json(201, {
        'challengeId': _challengeId,
        'method': 'email_otp',
        'expiresAt': '2026-11-13T12:05:00.000Z',
        'codeLength': MfaRules.emailCodeLength,
      }),
    );

    final challenge = await repository.requestMfaChallenge(
      const MfaChallengeRequest(mfaToken: 'mfa-1', method: MfaFactor.emailOtp),
    );

    expect(challenge.challengeId, _challengeId);
    expect(challenge.codeLength, MfaRules.emailCodeLength);
    final request = transport.requests.single;
    expect(request.uri.path, '/v1/auth/mfa/challenges');
    expect(jsonDecode(request.body!), {
      'mfaToken': 'mfa-1',
      'method': 'email_otp',
    });
  });

  test('verifyMfa sends the challengeId and maps the error code', () async {
    transport.queue.add(
      _json(400, {
        'type': 'about:blank',
        'title': 'Bad code',
        'status': 400,
        'code': IdentityErrorCode.mfaCodeInvalid.code,
      }),
    );

    await expectLater(
      repository.verifyMfa(
        const MfaVerifyRequest(
          mfaToken: 'mfa-1',
          challengeId: _challengeId,
          code: '123456',
        ),
      ),
      throwsA(
        isA<ApiErrorException>().having(
          (e) => IdentityErrorCode.fromCode(e.problem.code),
          'code',
          IdentityErrorCode.mfaCodeInvalid,
        ),
      ),
    );
    final request = transport.requests.single;
    expect(request.uri.path, '/v1/auth/mfa/verify');
    expect(jsonDecode(request.body!)['challengeId'], _challengeId);
  });

  test(
    'a verify request with a malformed challengeId is rejected locally',
    () async {
      await expectLater(
        repository.verifyMfa(
          const MfaVerifyRequest(
            mfaToken: 'mfa-1',
            challengeId: 'not-a-uuid',
            code: '123456',
          ),
        ),
        throwsA(isA<ContractViolationException>()),
      );
      expect(transport.requests, isEmpty);
    },
  );

  test('refresh posts the session token and decodes the new tokens', () async {
    transport.queue.add(
      _json(200, {
        'accessToken': 'a2',
        'accessExpiresAt': '2026-11-13T12:15:00.000Z',
        'sessionToken': 's2',
      }),
    );

    final tokens = await repository.refresh(sessionToken: 's1');

    expect(tokens.accessToken, 'a2');
    expect(tokens.sessionToken, 's2');
    final request = transport.requests.single;
    expect(request.method, 'POST');
    expect(request.uri.path, '/v1/auth/refresh');
    expect(jsonDecode(request.body!), {'sessionToken': 's1'});
    expect(request.headers.containsKey('authorization'), isFalse);
  });

  test('on the web refresh sends an empty body: the cookie travels', () async {
    transport.queue.add(
      _json(200, {
        'accessToken': 'a2',
        'accessExpiresAt': '2026-11-13T12:15:00.000Z',
      }),
    );

    final tokens = await repository.refresh();

    expect(tokens.sessionToken, isNull);
    expect(jsonDecode(transport.requests.single.body!), <String, dynamic>{});
  });

  test('a reused session token comes back as its contract code', () async {
    transport.queue.add(
      _json(401, {
        'type': 'about:blank',
        'title': 'Reused',
        'status': 401,
        'code': IdentityErrorCode.sessionReused.code,
      }),
    );

    await expectLater(
      repository.refresh(sessionToken: 'old'),
      throwsA(
        isA<ApiErrorException>().having(
          (e) => IdentityErrorCode.fromCode(e.problem.code),
          'code',
          IdentityErrorCode.sessionReused,
        ),
      ),
    );
  });

  test('logout posts to sign-out with the session token', () async {
    transport.queue.add(const TransportResponse(statusCode: 204));

    await repository.logout(sessionToken: 's1');

    final request = transport.requests.single;
    expect(request.method, 'POST');
    expect(request.uri.path, '/v1/auth/sign-out');
    expect(jsonDecode(request.body!), {'sessionToken': 's1'});
  });

  test(
    'without a session client the step-up fails before the network',
    () async {
      await expectLater(
        repository.startStepUp(),
        throwsA(
          isA<ApiErrorException>().having(
            (e) => e.platformCode,
            'code',
            PlatformErrorCode.authUnauthenticated,
          ),
        ),
      );
      expect(transport.requests, isEmpty);
    },
  );

  test('the step-up uses the session client and its access token', () async {
    final withSession = ApiAuthRepository(
      repository.client,
      sessionClient: ApiClient(
        transport: transport,
        baseUri: Uri.parse('https://api.example.com'),
        accessToken: () async => 'access-1',
      ),
    );
    transport.queue
      ..add(
        _json(201, {
          'mfaToken': 'step-1',
          'methods': ['device_otp', 'retina_scan'],
        }),
      )
      ..add(
        _json(201, {
          'challengeId': _challengeId,
          'method': 'device_otp',
          'expiresAt': '2026-11-13T12:03:00.000Z',
          'codeLength': MfaRules.deviceCodeLength,
        }),
      )
      ..add(
        _json(200, {
          'tokens': {
            'accessToken': 'access-2',
            'accessExpiresAt': '2026-11-13T12:15:00.000Z',
          },
          'mfaVerifiedAt': '2026-11-13T12:01:00.000Z',
        }),
      );

    final pending = await withSession.startStepUp();
    // A method this client does not know yet is dropped, not an error.
    expect(pending.methods, [MfaFactor.deviceOtp]);
    final challenge = await withSession.requestStepUpChallenge(
      MfaChallengeRequest(
        mfaToken: pending.mfaToken,
        method: MfaFactor.deviceOtp,
      ),
    );
    final result = await withSession.verifyStepUp(
      StepUpVerifyRequest(
        mfaToken: pending.mfaToken,
        challengeId: challenge.challengeId,
        code: '12345678',
      ),
    );

    expect(result.tokens.accessToken, 'access-2');
    expect(result.mfaVerifiedAt, DateTime.utc(2026, 11, 13, 12, 1));
    expect(transport.requests.map((r) => r.uri.path), [
      '/v1/me/step-up',
      '/v1/me/step-up/challenges',
      '/v1/me/step-up/verify',
    ]);
    for (final request in transport.requests) {
      expect(request.headers['authorization'], 'Bearer access-1');
    }
  });
}
