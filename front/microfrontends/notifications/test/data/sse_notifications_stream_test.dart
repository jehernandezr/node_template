import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/notifications_stream.dart';
import 'package:mf_notifications/src/data/sse_notifications_stream.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/notification_fixtures.dart';
import '../utils/scripted_event_stream_client.dart';

void main() {
  late ScriptedEventStreamClient server;
  late SseNotificationsStream stream;
  late List<NotificationFrame> frames;
  late StreamSubscription<NotificationFrame> subscription;

  setUp(() {
    server = ScriptedEventStreamClient();
    stream = SseNotificationsStream(
      client: ScriptedApi.client(ScriptedTransport()),
      httpClient: server,
      reconnectDelay: Duration.zero,
      maxReconnectDelay: Duration.zero,
    );
    frames = [];
  });

  tearDown(() => stream.close());

  void listen() => subscription = stream.frames.listen(frames.add);

  List<String> arrived() => [
    for (final frame in frames)
      if (frame is NotificationArrived) frame.notification.id,
  ];

  test('opens the stream of the user with the session token', () async {
    final first = server.connection();
    listen();
    await server.opening(1);

    first
      ..frame('notification', NotificationFixtures.json(1), id: '1-0')
      ..frame('unread-count', {'count': 3}, id: '1-1');
    await pumpEventQueue();

    final request = first.request!;
    expect(
      request.url.toString(),
      'https://api.example.test/v1/notifications/stream',
    );
    expect(request.headers['authorization'], 'Bearer test-session');
    expect(request.headers['accept'], 'text/event-stream');
    expect(request.headers.containsKey('last-event-id'), isFalse);
    expect(arrived(), [NotificationFixtures.id(1)]);
    expect(
      frames.whereType<UnreadCountReported>().map((frame) => frame.count),
      [3],
    );
  });

  test(
    'reconnects with Last-Event-ID and neither loses nor repeats a notice',
    () async {
      final first = server.connection();
      final second = server.connection();
      listen();
      await server.opening(1);

      first.frame('notification', NotificationFixtures.json(1), id: '1-0');
      await pumpEventQueue();
      await first.drop();
      await server.opening(2);
      second
        ..frame('notification', NotificationFixtures.json(1), id: '1-0')
        ..frame('notification', NotificationFixtures.json(2), id: '2-0');
      await pumpEventQueue();

      expect(second.request!.headers['last-event-id'], '1-0');
      expect(arrived(), [
        NotificationFixtures.id(1),
        NotificationFixtures.id(2),
      ]);
      expect(frames.whereType<StreamDisconnected>(), hasLength(1));
    },
  );

  test('retries a refused connection and a broken one', () async {
    server.refusal(503);
    final second = server.connection();
    final third = server.connection();
    listen();

    await server.opening(2);
    second.fail();
    await server.opening(3);
    third.frame('notification', NotificationFixtures.json(5), id: '5-0');
    await pumpEventQueue();

    expect(frames.whereType<StreamDisconnected>(), hasLength(2));
    expect(arrived(), [NotificationFixtures.id(5)]);
  });

  test('stops reconnecting once the session is closed', () async {
    final first = server.connection();
    server.connection();
    listen();
    await server.opening(1);

    first.frame('session-closed', {'sessionId': 'all'}, id: '9-0');
    await pumpEventQueue();
    await first.drop();
    await pumpEventQueue();

    expect(server.opened, hasLength(1));
  });

  test(
    'drops frames that break the contract or that it does not know',
    () async {
      final first = server.connection();
      listen();
      await server.opening(1);

      first
        ..frame('notification', {'id': 'not-a-notification'}, id: '1-0')
        ..frame('unread-count', {'count': -1}, id: '1-1')
        ..frame('presence', {'online': true}, id: '1-2')
        ..write('event: notification\ndata: not json\n\n');
      await pumpEventQueue();

      expect(frames, isEmpty);
    },
  );

  test(
    'close stops reading, releases the client and ends the frames',
    () async {
      final first = server.connection();
      var ended = false;
      subscription = stream.frames.listen(
        frames.add,
        onDone: () => ended = true,
      );
      await server.opening(1);

      await stream.close();

      expect(first.isCancelled, isTrue);
      expect(server.isClosed, isTrue);
      expect(ended, isTrue);
      await subscription.cancel();
    },
  );
}
