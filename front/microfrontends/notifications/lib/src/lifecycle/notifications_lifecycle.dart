import 'dart:async';

import 'package:shell_core/shell_core.dart';

// En web la variante por defecto carga `src/data` con `deferred as`; en la VM
// se usa la variante directa (ver `unread_counts.dart`).
import 'unread_counts.dart' if (dart.library.io) 'unread_counts_io.dart';

/// Publica [UnreadCountChanged] al iniciar y cada vez que cambia la cantidad de
/// no leídas. Usa el repositorio del scope, la misma instancia que las pantallas.
///
/// El runtime crea una instancia por activación (`lifecycleFactory`). Emite con
/// [ShellContext.emit], así un valor que llega después de cambiar de identidad
/// se descarta.
final class NotificationsLifecycle extends Microfrontend {
  NotificationsLifecycle();

  StreamSubscription<int>? _subscription;

  @override
  Future<void> initialize(ShellContext context) async {
    final scope = context.scope;
    if (scope == null) {
      throw StateError('NotificationsLifecycle needs the scope of the runtime');
    }
    final counts = await loadUnreadCounts(scope);
    // La identidad pudo cambiar mientras se cargaba la librería de datos.
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
