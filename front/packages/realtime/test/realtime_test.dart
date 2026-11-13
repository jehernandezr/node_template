import 'package:flutter_test/flutter_test.dart';

import 'package:realtime/realtime.dart';

RealtimeEvent event(String id, [String type = 'message']) => RealtimeEvent(
  id: id,
  type: type,
  data: {'id': id},
  receivedAt: DateTime.utc(2026, 11, 11),
);

/// Espera lo suficiente para que pasen los backoff de prueba (1 a 4 ms).
Future<void> settle() => Future<void>.delayed(const Duration(milliseconds: 50));

RealtimeBackoff fastBackoff() => RealtimeBackoff(
  initial: const Duration(milliseconds: 1),
  max: const Duration(milliseconds: 4),
  jitter: 0,
  random: () => 0,
);

void main() {
  test('reconnects after a drop passing the last event id', () async {
    final transport = FakeRealtimeTransport();
    final client = RealtimeClient(transport, backoff: fastBackoff());
    final statuses = <RealtimeStatus>[];
    client.statuses.listen(statuses.add);

    client.start();
    await settle();
    transport.emit(event('1'));
    await settle();
    transport.dropConnection();
    await settle();

    expect(transport.connectLog, [null, '1']);
    expect(client.lastEventId, '1');
    expect(client.status, RealtimeStatus.connected);
    expect(statuses, [
      RealtimeStatus.connecting,
      RealtimeStatus.connected,
      RealtimeStatus.reconnecting,
      RealtimeStatus.connected,
    ]);
    await client.dispose();
  });

  test('replays missed events once and de-duplicates by id', () async {
    final transport = FakeRealtimeTransport();
    final client = RealtimeClient(transport, backoff: fastBackoff());
    final received = <String>[];
    client.events.listen((e) => received.add(e.id));

    client.start();
    await settle();
    transport.emit(event('1'));
    transport.emit(event('2'));
    await settle();

    transport.dropConnection();
    transport.emit(event('3')); // ocurre mientras la conexión está caída
    await settle();
    expect(transport.connectLog.last, '2');

    transport.emit(event('3')); // duplicado tras reconectar
    transport.emit(event('4'));
    await settle();

    expect(received, ['1', '2', '3', '4']);
    await client.dispose();
  });

  test('backoff grows exponentially and is capped', () {
    final backoff = RealtimeBackoff(
      initial: const Duration(milliseconds: 100),
      max: const Duration(milliseconds: 500),
      jitter: 0,
      random: () => 0,
    );

    expect(
      [for (var i = 1; i <= 5; i++) backoff.delayFor(i).inMilliseconds],
      [100, 200, 400, 500, 500],
    );
  });

  test('jitter shortens the delay by up to its fraction', () {
    final backoff = RealtimeBackoff(
      initial: const Duration(milliseconds: 100),
      max: const Duration(seconds: 1),
      jitter: 0.5,
      random: () => 1,
    );

    expect(backoff.delayFor(1), const Duration(milliseconds: 50));
    expect(backoff.delayFor(2), const Duration(milliseconds: 100));
  });

  test('dispose stops reconnecting and closes the transport', () async {
    final transport = FakeRealtimeTransport();
    final client = RealtimeClient(transport, backoff: fastBackoff());
    client.start();
    await settle();

    transport.dropConnection();
    await client.dispose();
    await settle();

    expect(transport.connectCount, 1);
    expect(transport.isClosed, isTrue);
    expect(client.status, RealtimeStatus.disconnected);
  });

  test('subscribe delivers only events of the requested type', () async {
    final transport = FakeRealtimeTransport();
    final client = RealtimeClient(transport, backoff: fastBackoff());
    final chats = <String>[];
    client.subscribe('chat').listen((e) => chats.add(e.id));

    client.start();
    await settle();
    transport.emit(event('1', 'chat'));
    transport.emit(event('2', 'typing'));
    transport.emit(event('3', 'chat'));
    await settle();

    expect(chats, ['1', '3']);
    await client.dispose();
  });
}
