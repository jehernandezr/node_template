import 'package:shell_core/shell_core.dart';

/// Number of unread notifications of the current user.
///
/// The notifications lifecycle publishes it and the manifest declares it as
/// the badge of its menu entry, so the shell draws it without knowing this
/// microfrontend. It replays: a shell that subscribes late sees the last
/// value, until the identity changes (`ShellEventBus.clearReplay`).
final class UnreadCountChanged extends ReplayableShellEvent {
  /// The unread count changed to [count].
  const UnreadCountChanged(this.count);

  /// Unread notifications, zero or more.
  final int count;
}
