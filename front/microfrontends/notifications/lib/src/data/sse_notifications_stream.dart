import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:math' as math;

import 'package:api/api.dart';
import 'package:contracts/contracts.dart' as api;
import 'package:http/http.dart' as http;

import '../shared/constants/notifications_api.dart';
import 'notifications_mapper.dart';
import 'notifications_stream.dart';
import 'server_sent_event_reader.dart';

/// [NotificationsStream] over the server-sent events of
/// [NotificationsApi.streamPath], signed with the token of [ApiClient] and
/// sent to its current base, so it follows the region of the tenant.
///
/// When the connection drops it emits [StreamDisconnected] and reconnects
/// after a wait that doubles up to [maxReconnectDelay], sending the id of the
/// last frame in `Last-Event-ID`: the server replays what was missed, and a
/// frame whose id already arrived is dropped, so nothing is lost or repeated.
/// A `session-closed` frame ends the reconnections: that session is over.
final class SseNotificationsStream implements NotificationsStream {
  SseNotificationsStream({
    required this._client,
    required this._httpClient,
    this.reconnectDelay = NotificationsApi.reconnectDelay,
    this.maxReconnectDelay = NotificationsApi.maxReconnectDelay,
  }) : _delay = reconnectDelay {
    _frames = StreamController<NotificationFrame>.broadcast(onListen: _start);
  }

  /// First wait before reconnecting, until the server sends its `retry`.
  final Duration reconnectDelay;

  /// Longest wait between two reconnections.
  final Duration maxReconnectDelay;

  final ApiClient _client;
  final http.Client _httpClient;
  late final StreamController<NotificationFrame> _frames;
  final LinkedHashSet<String> _seen = LinkedHashSet<String>();

  Duration _delay;
  String? _lastEventId;
  bool _started = false;
  bool _closed = false;
  bool _sessionClosed = false;
  Timer? _reconnect;
  StreamSubscription<String>? _lines;
  Completer<void>? _connection;

  @override
  Stream<NotificationFrame> get frames => _frames.stream;

  @override
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    _reconnect?.cancel();
    final lines = _lines;
    _lines = null;
    _endConnection();
    await lines?.cancel();
    _httpClient.close();
    await _frames.close();
  }

  void _start() {
    if (_started) return;
    _started = true;
    unawaited(_connectAndWatch());
  }

  Future<void> _connectAndWatch() async {
    final reader = ServerSentEventReader();
    try {
      final response = await _httpClient.send(await _request());
      if (response.statusCode != 200 || _closed) {
        // Only the status matters: the body of a refusal is not read.
        unawaited(response.stream.listen(null).cancel());
      } else {
        _delay = reconnectDelay;
        await _watch(response.stream, reader);
      }
    } on Exception {
      // A network failure is a dropped connection: the stream retries below.
    }
    final retry = reader.retry;
    if (retry != null) _delay = retry;
    _scheduleReconnect();
  }

  Future<http.BaseRequest> _request() async {
    final token = await _client.accessToken?.call();
    final base = _client.baseUri;
    final basePath = base.path.endsWith('/')
        ? base.path.substring(0, base.path.length - 1)
        : base.path;
    return http.Request(
        'GET',
        base.replace(path: '$basePath${NotificationsApi.streamPath}'),
      )
      ..headers.addAll({
        'accept': 'text/event-stream',
        'cache-control': 'no-store',
        if (token != null) 'authorization': 'Bearer $token',
        'last-event-id': ?_lastEventId,
      });
  }

  Future<void> _watch(Stream<List<int>> body, ServerSentEventReader reader) {
    final connection = Completer<void>();
    _connection = connection;
    _lines = body
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen(
          (line) {
            final event = reader.read(line);
            if (event != null) _dispatch(event);
          },
          onError: (Object error, StackTrace stack) {
            if (error is Error) Error.throwWithStackTrace(error, stack);
            _endConnection();
          },
          onDone: _endConnection,
          cancelOnError: true,
        );
    return connection.future;
  }

  void _endConnection() {
    final connection = _connection;
    _connection = null;
    if (connection != null && !connection.isCompleted) connection.complete();
  }

  void _scheduleReconnect() {
    _lines = null;
    if (_closed || _sessionClosed) return;
    _frames.add(const StreamDisconnected());
    final wait = _delay;
    _delay = Duration(
      milliseconds: math.min(
        wait.inMilliseconds * 2,
        maxReconnectDelay.inMilliseconds,
      ),
    );
    _reconnect = Timer(wait, () => unawaited(_connectAndWatch()));
  }

  void _dispatch(ServerSentEvent event) {
    final id = event.id;
    if (id != null) {
      _lastEventId = id;
      if (!_remember(id)) return;
    }
    final Object? data;
    try {
      data = jsonDecode(event.data);
    } on FormatException {
      return;
    }
    if (data is! Map<String, dynamic>) return;
    switch (api.NotificationFrameType.tryParse(event.type)) {
      case api.NotificationFrameType.notification:
        if (api.AppNotificationSchema.validate(data).isEmpty) {
          _frames.add(
            NotificationArrived(
              NotificationsMapper.notification(
                api.AppNotification.fromJson(data),
              ),
            ),
          );
        }
      case api.NotificationFrameType.unreadCount:
        if (api.UnreadCountSchema.validate(data).isEmpty) {
          _frames.add(
            UnreadCountReported(api.UnreadCount.fromJson(data).count),
          );
        }
      case api.NotificationFrameType.sessionClosed:
        _sessionClosed = true;
      case null:
        break;
    }
  }

  /// Whether [id] is new. Keeps the last [NotificationsApi.rememberedFrames].
  bool _remember(String id) {
    if (!_seen.add(id)) return false;
    if (_seen.length > NotificationsApi.rememberedFrames) {
      _seen.remove(_seen.first);
    }
    return true;
  }
}
