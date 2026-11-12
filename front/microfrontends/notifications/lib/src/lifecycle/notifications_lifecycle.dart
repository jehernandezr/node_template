import 'dart:async';

import 'package:shell_core/shell_core.dart';

import '../data/notifications_scope.dart';

/// Publica [UnreadCountChanged] al iniciar y cada vez que cambia la cantidad de
/// no leídas. Usa el repositorio del scope, la misma instancia que las pantallas.
final class NotificationsLifecycle extends Microfrontend {
  NotificationsLifecycle();

  StreamSubscription<int>? _subscription;

  @override
  Future<void> initialize(ShellContext context) async {
    await dispose();
    final repository = notificationsRepositoryOf(context.scope!);
    _subscription = repository.watchUnreadCount().listen(
      (count) => context.eventBus.emit(UnreadCountChanged(count)),
    );
  }

  @override
  Future<void> dispose() async {
    final subscription = _subscription;
    _subscription = null;
    await subscription?.cancel();
  }
}
