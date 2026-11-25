/// One event of a `text/event-stream`.
final class ServerSentEvent {
  const ServerSentEvent({required this.type, required this.data, this.id});

  /// Value of `event:`, or `message` when the server sent none.
  final String type;

  /// The `data:` lines joined with a newline.
  final String data;

  /// Value of `id:`, or null when the event has none.
  final String? id;
}

/// Turns the lines of a `text/event-stream` into [ServerSentEvent]s, as the
/// HTML specification of server-sent events reads them.
final class ServerSentEventReader {
  static const String _defaultType = 'message';

  String? _type;
  String? _id;
  final List<String> _data = [];

  /// The wait the server asked for before reconnecting, from `retry:`.
  Duration? retry;

  /// Reads one [line] without its line break. Returns the event that a blank
  /// line completes, or null.
  ServerSentEvent? read(String line) {
    if (line.isEmpty) return _dispatch();
    if (line.startsWith(':')) return null;
    final colon = line.indexOf(':');
    final field = colon < 0 ? line : line.substring(0, colon);
    var value = colon < 0 ? '' : line.substring(colon + 1);
    if (value.startsWith(' ')) value = value.substring(1);
    switch (field) {
      case 'event':
        _type = value;
      case 'data':
        _data.add(value);
      case 'id':
        if (!value.contains('\u0000')) _id = value;
      case 'retry':
        final millis = int.tryParse(value);
        if (millis != null && millis >= 0) {
          retry = Duration(milliseconds: millis);
        }
    }
    return null;
  }

  ServerSentEvent? _dispatch() {
    final type = _type;
    _type = null;
    if (_data.isEmpty) return null;
    final event = ServerSentEvent(
      type: type == null || type.isEmpty ? _defaultType : type,
      data: _data.join('\n'),
      id: _id,
    );
    _data.clear();
    return event;
  }
}
