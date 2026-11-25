import 'dart:async';

import 'package:mf_notifications/src/data/notifications_stream.dart';

/// [NotificationsStream] whose frames the test sends with [emit].
final class FakeNotificationsStream implements NotificationsStream {
  final StreamController<NotificationFrame> _frames =
      StreamController<NotificationFrame>.broadcast();

  /// Whether [close] ran.
  bool isClosed = false;

  void emit(NotificationFrame frame) => _frames.add(frame);

  @override
  Stream<NotificationFrame> get frames => _frames.stream;

  @override
  Future<void> close() async {
    isClosed = true;
    await _frames.close();
  }
}
