import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/api_account_repository.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';

class _Transport implements HttpTransport {
  final List<TransportRequest> requests = [];
  final List<TransportResponse> answers = [];

  @override
  Future<TransportResponse> send(TransportRequest request) async {
    requests.add(request);
    return answers.removeAt(0);
  }
}

const _id = '0193f1c2-0000-7000-8000-000000000001';

Map<String, Object?> _session(String id, {bool current = false}) => {
  'id': id,
  'deviceName': 'Chrome',
  'platform': 'web',
  'lastSeenAt': '2026-11-12T10:00:00.000Z',
  'current': current,
};

TransportResponse _json(int status, Object body) =>
    TransportResponse(statusCode: status, body: jsonEncode(body));

void main() {
  late _Transport transport;
  late FakeAccountRepository pending;
  late ApiAccountRepository repository;

  setUp(() {
    transport = _Transport();
    pending = FakeAccountRepository(delay: Duration.zero);
    repository = ApiAccountRepository(
      client: ApiClient(
        transport: transport,
        baseUri: Uri.parse('https://api.example.com'),
        accessToken: () async => 'token',
      ),
      pending: pending,
    );
  });

  group('invalid requests never reach the transport', () {
    test('revoking a session with a malformed id', () async {
      await expectLater(
        repository.revokeSession('not-a-uuid'),
        throwsA(isA<ContractViolationException>()),
      );
      expect(transport.requests, isEmpty);
    });
  });

  group('sessions', () {
    test('lists every page with the page size of the contract', () async {
      transport.answers
        ..add(
          _json(200, {
            'items': [_session(_id, current: true)],
            'nextCursor': 'c1',
          }),
        )
        ..add(
          _json(200, {
            'items': [_session('0193f1c2-0000-7000-8000-000000000002')],
            'nextCursor': null,
          }),
        );
      final sessions = await repository.listSessions();
      expect(sessions.map((s) => s.current), [true, false]);
      expect(sessions.first.platform, ClientPlatform.web);
      expect(transport.requests, hasLength(2));
      final first = transport.requests.first;
      expect(first.method, 'GET');
      expect(first.uri.path, '/v1/me/sessions');
      expect(first.uri.queryParameters['limit'], '100');
      expect(first.headers['authorization'], 'Bearer token');
      expect(transport.requests.last.uri.queryParameters['after'], 'c1');
    });

    test('revokes one session with DELETE on its path', () async {
      transport.answers.add(const TransportResponse(statusCode: 204));
      await repository.revokeSession(_id);
      final request = transport.requests.single;
      expect(request.method, 'DELETE');
      expect(request.uri.path, '/v1/me/sessions/$_id');
    });

    test('revokes the other sessions and returns the count', () async {
      transport.answers.add(_json(200, {'revoked': 3}));
      expect(await repository.revokeOtherSessions(), 3);
      expect(
        transport.requests.single.uri.path,
        '/v1/me/sessions/revoke-others',
      );
    });

    test('an API error reaches the caller', () async {
      transport.answers.add(
        _json(401, {
          'type': 'about:blank',
          'title': 'Revoked',
          'status': 401,
          'code': 'IDENTITY.SESSION.REVOKED',
        }),
      );
      await expectLater(
        repository.listSessions(),
        throwsA(isA<ApiErrorException>()),
      );
    });
  });

  test('lists trusted devices', () async {
    transport.answers.add(
      _json(200, {
        'items': [
          {
            'id': _id,
            'name': 'iPhone',
            'platform': 'ios',
            'lastSeenAt': '2026-11-12T10:00:00.000Z',
            'verifier': true,
          },
        ],
        'nextCursor': null,
      }),
    );
    final devices = await repository.listDevices();
    expect(devices.single.verifier, isTrue);
    expect(devices.single.platform, ClientPlatform.ios);
    expect(transport.requests.single.uri.path, '/v1/me/devices');
  });

  test('operations without a contract go to the pending repository', () async {
    final profile = await repository.loadProfile();
    expect(profile.name, 'Ana Pérez');
    expect(transport.requests, isEmpty);
  });

  test('dispose releases the pending repository', () async {
    await repository.dispose();
    expect(pending.isDisposed, isTrue);
  });
}
