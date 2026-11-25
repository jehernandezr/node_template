import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/server_sent_event_reader.dart';

List<ServerSentEvent> _readAll(ServerSentEventReader reader, String text) => [
  for (final line in text.split('\n')) ?reader.read(line),
];

void main() {
  test('reads the type, the id and the data of each event', () {
    final events = _readAll(
      ServerSentEventReader(),
      'id: 1-0\nevent: notification\ndata: {"a":1}\n\n',
    );

    expect(events.single.type, 'notification');
    expect(events.single.id, '1-0');
    expect(events.single.data, '{"a":1}');
  });

  test('joins several data lines and keeps the last id for the next', () {
    final events = _readAll(
      ServerSentEventReader(),
      'id: 7\ndata: first\ndata: second\n\ndata: third\n\n',
    );

    expect(events.map((event) => event.data), ['first\nsecond', 'third']);
    expect(events.map((event) => event.id), ['7', '7']);
    expect(events.map((event) => event.type), ['message', 'message']);
  });

  test('skips comments and blank events, and reads the retry', () {
    final reader = ServerSentEventReader();

    final events = _readAll(reader, ': keep-alive\n\nretry: 3000\n\n');

    expect(events, isEmpty);
    expect(reader.retry, const Duration(seconds: 3));
  });

  test(
    'a field without a colon has an empty value and a bad retry is ignored',
    () {
      final reader = ServerSentEventReader();

      final events = _readAll(reader, 'retry: soon\ndata\n\n');

      expect(events.single.data, '');
      expect(reader.retry, isNull);
    },
  );
}
