import 'package:shell_core/shell_core.dart';

// Solo en la VM (móvil, escritorio y pruebas), donde no hay bundle que
// dividir. La web usa `unread_counts.dart`, con el import diferido.
import '../data/notifications_scope.dart';

/// Contador de no leídas del repositorio del [scope], o null si el scope ya
/// se cerró. Misma firma que la variante web, sin timers.
Future<Stream<int>?> loadUnreadCounts(MicrofrontendScope scope) async {
  if (scope.isDisposed) return null;
  return notificationsRepositoryOf(scope).watchUnreadCount();
}
