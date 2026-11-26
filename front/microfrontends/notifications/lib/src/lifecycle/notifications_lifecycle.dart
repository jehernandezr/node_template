import 'dart:async';

import 'package:shell_core/shell_core.dart';

import 'unread_count_changed.dart';
import 'unread_counts.dart';

/// Publishes [UnreadCountChanged] on start and every time the number of
/// unread notifications changes. It uses the repository of the scope, the
/// same instance the screens use.
///
/// The runtime creates one instance per activation (`lifecycleFactory`). It
/// emits with [ShellContext.emit], so a value that arrives after the identity
/// changed is dropped.
final class NotificationsLifecycle extends Microfrontend {
  /// Lifecycle without a connection until the session starts.
  NotificationsLifecycle();

  StreamSubscription<int>? _subscription;

  /// The identity may have changed while the data library loaded.
  @override
  Future<void> initialize(ShellContext context) async {
    final counts = await UnreadCounts.load(context.scope);
    if (counts == null || context.isDisposed) return;
    _subscription = counts.listen(
      (count) => context.emit(UnreadCountChanged(count)),
    );
  }

  @override
  Future<void> dispose() async {
    final subscription = _subscription;
    _subscription = null;
    await subscription?.cancel();
  }
}
