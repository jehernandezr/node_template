import '../shared/types/types.dart';

/// What the live stream of the user tells the repository.
sealed class NotificationFrame {
  const NotificationFrame();
}

/// A notification that arrived while the app is open.
final class NotificationArrived extends NotificationFrame {
  const NotificationArrived(this.notification);

  final AppNotification notification;
}

/// The server counted the unread notifications again.
final class UnreadCountReported extends NotificationFrame {
  const UnreadCountReported(this.count);

  final int count;
}

/// The connection dropped or could not open; the stream tries again by
/// itself. Until then, nothing arrives live.
final class StreamDisconnected extends NotificationFrame {
  const StreamDisconnected();
}

/// Live connection with the notifications of the user.
abstract interface class NotificationsStream {
  /// Frames of the user. The first listener opens the connection, which
  /// stays open, reconnecting when it drops, until [close].
  Stream<NotificationFrame> get frames;

  /// Closes the connection and ends [frames]. Calling it again does nothing.
  Future<void> close();
}
