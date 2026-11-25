import 'dart:async';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart' as api;

import '../shared/constants/notifications_api.dart';
import '../shared/types/types.dart';
import 'notifications_mapper.dart';
import 'notifications_repository.dart';
import 'notifications_stream.dart';

/// [NotificationsRepository] over the notifications API, with the generated
/// [api.NotificationsRoutes] and [ApiClient], and the live [stream] of the
/// user.
///
/// [live] and [watchUnreadCount] come from [stream]. While it is
/// disconnected, every reconnection attempt reads the count from the API
/// instead, and so does every read mark made here. A count that cannot be
/// read is skipped: the next attempt reads it again.
final class ApiNotificationsRepository implements NotificationsRepository {
  ApiNotificationsRepository({required this._client, required this._stream});

  final ApiClient _client;
  final NotificationsStream _stream;
  final StreamController<void> _readMarks = StreamController<void>.broadcast();
  bool _disposed = false;

  @override
  Future<List<AppNotification>> fetchInbox() async {
    final page = await _client.send(
      api.NotificationsRoutes.listInbox,
      const api.PageQuery(limit: NotificationsApi.inboxPageSize),
    );
    return [
      for (final notification in page.items)
        NotificationsMapper.notification(notification),
    ];
  }

  @override
  Future<int> unreadCount() async => (await _client.send(
    api.NotificationsRoutes.getUnreadCount,
    const api.Empty(),
  )).count;

  @override
  Stream<int> watchUnreadCount() {
    if (_disposed) return const Stream<int>.empty();
    final subscriptions = <StreamSubscription<void>>[];
    var latestRead = 0;
    late final StreamController<int> counts;

    Future<void> readCount() async {
      final read = ++latestRead;
      try {
        final count = await unreadCount();
        if (read == latestRead && !counts.isClosed) counts.add(count);
      } on Exception {
        // Offline or refused: the next reconnection or read mark tries again.
      }
    }

    counts = StreamController<int>(
      onListen: () {
        unawaited(readCount());
        subscriptions
          ..add(
            _stream.frames.listen((frame) {
              switch (frame) {
                case UnreadCountReported(:final count):
                  latestRead++;
                  counts.add(count);
                case StreamDisconnected():
                  unawaited(readCount());
                case NotificationArrived():
                  break;
              }
            }, onDone: () => unawaited(counts.close())),
          )
          ..add(_readMarks.stream.listen((_) => unawaited(readCount())));
      },
      onCancel: () => Future.wait([
        for (final subscription in subscriptions) subscription.cancel(),
      ]),
    );
    return counts.stream;
  }

  @override
  Future<void> markAsRead(String id) async {
    await _client.send(
      api.NotificationsRoutes.markRead,
      api.MarkNotificationReadRequest(notificationId: id),
    );
    _readMarked();
  }

  @override
  Future<void> markAllAsRead() async {
    await _client.send(api.NotificationsRoutes.markAllRead, const api.Empty());
    _readMarked();
  }

  @override
  Future<NotificationPreferences> fetchPreferences() async =>
      NotificationsMapper.preferences(
        await _client.send(
          api.NotificationsRoutes.getPreferences,
          const api.Empty(),
        ),
      );

  @override
  Future<void> savePreferences(NotificationPreferences preferences) =>
      _client.send(
        api.NotificationsRoutes.savePreferences,
        NotificationsMapper.preferencesRequest(preferences),
      );

  @override
  Stream<AppNotification> live() => _stream.frames
      .where((frame) => frame is NotificationArrived)
      .map((frame) => (frame as NotificationArrived).notification);

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    await _readMarks.close();
    await _stream.close();
  }

  void _readMarked() {
    if (!_readMarks.isClosed) _readMarks.add(null);
  }
}
