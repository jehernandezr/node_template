import 'package:contracts/contracts.dart' as api;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/api_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_stream.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/fake_notifications_stream.dart';
import '../utils/notification_fixtures.dart';

Map<String, Object?> _preferences() => {
  'enabled': [
    {
      'type': 'task_updated',
      'channels': ['in_app', 'email'],
    },
    {'type': 'invoice_issued', 'channels': <String>[]},
  ],
  'quietStart': '21:30',
  'quietEnd': '06:45',
  'timezone': 'America/Bogota',
};

void main() {
  late ScriptedTransport transport;
  late FakeNotificationsStream stream;
  late ApiNotificationsRepository repository;

  setUp(() {
    transport = ScriptedTransport();
    stream = FakeNotificationsStream();
    repository = ApiNotificationsRepository(
      client: ScriptedApi.client(transport),
      stream: stream,
    );
  });

  tearDown(() => repository.dispose());

  test('reads the inbox from the first page of the contract', () async {
    transport.json(200, {
      'items': [
        NotificationFixtures.json(2),
        NotificationFixtures.json(1, read: true),
      ],
      'nextCursor': null,
    });

    final inbox = await repository.fetchInbox();

    expect(inbox.map((notification) => notification.read), [false, true]);
    expect(inbox.first.type, NotificationType.taskUpdated);
    expect(transport.requests.single.uri.path, '/v1/notifications');
    expect(transport.requests.single.uri.queryParameters, {'limit': '100'});
  });

  test('marks one and all as read on their routes', () async {
    transport
      ..empty(204)
      ..empty(204);

    await repository.markAsRead(NotificationFixtures.id(1));
    await repository.markAllAsRead();

    expect(
      [
        for (final request in transport.requests)
          '${request.method} ${request.uri.path}',
      ],
      [
        'POST /v1/notifications/${NotificationFixtures.id(1)}/read',
        'POST /v1/notifications/read-all',
      ],
    );
  });

  test(
    'reads the preferences with their zone and saves them back with it',
    () async {
      transport
        ..json(200, _preferences())
        ..empty(204);

      final preferences = await repository.fetchPreferences();
      await repository.savePreferences(
        preferences.withChannel(
          NotificationType.invoiceIssued,
          NotificationChannel.push,
          true,
        ),
      );

      expect(preferences.quietStart, const ClockTime(21, 30));
      expect(preferences.timezone, 'America/Bogota');
      expect(
        preferences.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isTrue,
      );
      final saved = transport.bodyOf(1);
      expect(saved['timezone'], 'America/Bogota');
      expect(saved['quietEnd'], '06:45');
      expect(saved['enabled'], [
        {
          'type': 'security_alert',
          'channels': ['in_app', 'push', 'email'],
        },
        {
          'type': 'task_updated',
          'channels': ['in_app', 'email'],
        },
        {
          'type': 'invoice_issued',
          'channels': ['push'],
        },
        {'type': 'account_activity', 'channels': <String>[]},
      ]);
    },
  );

  test('live notifications come from the stream', () async {
    final arrived = <AppNotification>[];
    final subscription = repository.live().listen(arrived.add);

    stream
      ..emit(const UnreadCountReported(4))
      ..emit(NotificationArrived(NotificationFixtures.item('n-9')));
    await pumpEventQueue();

    expect(arrived.map((notification) => notification.id), ['n-9']);
    await subscription.cancel();
  });

  group('unread count', () {
    test('starts with the API and follows the counts of the stream', () async {
      transport.json(200, {'count': 2});
      final counts = <int>[];
      final subscription = repository.watchUnreadCount().listen(counts.add);
      await pumpEventQueue();

      stream.emit(const UnreadCountReported(5));
      await pumpEventQueue();

      expect(counts, [2, 5]);
      await subscription.cancel();
    });

    test(
      'reads the API again on every reconnection attempt and read mark',
      () async {
        transport
          ..json(200, {'count': 2})
          ..json(200, {'count': 3})
          ..empty(204)
          ..json(200, {'count': 0});
        final counts = <int>[];
        final subscription = repository.watchUnreadCount().listen(counts.add);
        await pumpEventQueue();

        stream.emit(const StreamDisconnected());
        await pumpEventQueue();
        await repository.markAllAsRead();
        await pumpEventQueue();

        expect(counts, [2, 3, 0]);
        expect(transport.isDrained, isTrue);
        await subscription.cancel();
      },
    );

    test('skips a count it cannot read and keeps listening', () async {
      transport
        ..unreachable()
        ..json(200, {'count': 7});
      final counts = <int>[];
      final errors = <Object>[];
      final subscription = repository.watchUnreadCount().listen(
        counts.add,
        onError: errors.add,
      );
      await pumpEventQueue();

      stream.emit(const StreamDisconnected());
      await pumpEventQueue();

      expect(counts, [7]);
      expect(errors, isEmpty);
      await subscription.cancel();
    });
  });

  test('dispose closes the stream and ends the counts', () async {
    transport.json(200, {'count': 1});
    var ended = false;
    repository.watchUnreadCount().listen(null, onDone: () => ended = true);
    await pumpEventQueue();

    await repository.dispose();
    await pumpEventQueue();

    expect(stream.isClosed, isTrue);
    expect(ended, isTrue);
    await expectLater(repository.watchUnreadCount(), emitsDone);
  });

  test(
    'a request that breaks the contract never reaches the network',
    () async {
      await expectLater(
        repository.markAsRead('not-a-uuid'),
        throwsA(isA<api.ContractViolationException>()),
      );
      expect(transport.requests, isEmpty);
    },
  );
}
