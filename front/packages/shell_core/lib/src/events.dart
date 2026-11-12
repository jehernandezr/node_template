import 'shell_event_bus.dart';

/// Number of unread notifications for the current user.
///
/// Replayable: the latest value is kept until the identity changes, so a shell
/// that subscribes late still shows the badge. See [ShellEventBus.clearReplay].
final class UnreadCountChanged extends ReplayableShellEvent {
  const UnreadCountChanged(this.count);

  /// Unread notifications, zero or more.
  final int count;
}
