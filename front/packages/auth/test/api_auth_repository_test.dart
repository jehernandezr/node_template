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

  test('without a refresh route the session ends as unauthenticated', () async {
    await expectLater(
      repository.refresh(),
      throwsA(
        isA<ApiErrorException>().having(
          (e) => e.platformCode,
          'code',
          PlatformErrorCode.authUnauthenticated,
        ),
      ),
    );
    expect(transport.requests, isEmpty);
  });
}
