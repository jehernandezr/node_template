import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// One connection of [ScriptedEventStreamClient]: the server side of a
/// `text/event-stream` that the test writes to and drops.
final class ScriptedEventStream {
  ScriptedEventStream._(this.statusCode);

  final int statusCode;
  final StreamController<List<int>> _body = StreamController<List<int>>();

  /// The request that opened this connection, once it arrived.
  http.BaseRequest? request;

  /// Whether the client stopped reading this connection.
  bool get isCancelled => _cancelled;
  bool _cancelled = false;

  /// Sends one frame of [type] with [data] as JSON and an optional [id].
  void frame(String type, Object data, {String? id}) => write(
    '${id == null ? '' : 'id: $id\n'}event: $type\ndata: ${jsonEncode(data)}\n\n',
  );

  /// Sends [text] as it is, for example a comment or half a frame.
  void write(String text) => _body.add(utf8.encode(text));

  /// The server ends the response.
  Future<void> drop() => _body.close();

  /// The connection breaks with a network error.
  void fail() => _body.addError(http.ClientException('connection reset'));

  http.StreamedResponse _response(http.BaseRequest request) {
    this.request = request;
    _body.onCancel = () => _cancelled = true;
    return http.StreamedResponse(_body.stream, statusCode, request: request);
  }
}

/// [http.Client] for the server-sent events of the notifications: each
/// request takes the next connection scripted with [connection] or
/// [refusal], and a request without one never answers.
final class ScriptedEventStreamClient extends http.BaseClient {
  final List<ScriptedEventStream> _pending = [];

  /// Every connection that was opened, in order.
  final List<ScriptedEventStream> opened = [];

  /// Whether the stream closed the client.
  bool isClosed = false;

  final StreamController<ScriptedEventStream> _openings =
      StreamController<ScriptedEventStream>.broadcast();

  /// Scripts the next connection, answered with 200.
  ScriptedEventStream connection() => _script(200);

  /// Scripts the next connection, refused with [statusCode].
  ScriptedEventStream refusal(int statusCode) => _script(statusCode);

  /// Completes when connection number [count] (from 1) is open.
  Future<ScriptedEventStream> opening(int count) async {
    while (opened.length < count) {
      await _openings.stream.first;
    }
    return opened[count - 1];
  }

  ScriptedEventStream _script(int statusCode) {
    final stream = ScriptedEventStream._(statusCode);
    _pending.add(stream);
    return stream;
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    if (_pending.isEmpty) return Completer<http.StreamedResponse>().future;
    final stream = _pending.removeAt(0);
    opened.add(stream);
    _openings.add(stream);
    return Future.value(stream._response(request));
  }

  @override
  void close() {
    isClosed = true;
    unawaited(_openings.close());
  }
}
