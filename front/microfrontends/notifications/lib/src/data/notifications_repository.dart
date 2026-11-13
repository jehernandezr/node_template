import 'package:shell_core/shell_core.dart';

import '../shared/types/types.dart';

/// Puerto de datos de notificaciones. [FakeNotificationsRepository] la
/// implementa en pruebas y en desarrollo; la implementación HTTP llegará
/// cuando el backend publique el contrato de notificaciones.
///
/// Es un [ScopedResource]: el scope de la identidad lo cierra con [dispose],
/// que cancela suscripciones y cierra los streams abiertos.
abstract interface class NotificationsRepository implements ScopedResource {
  /// Bandeja del usuario, la más reciente primero.
  Future<List<AppNotification>> fetchInbox();

  /// Cantidad de notificaciones no leídas.
  Future<int> unreadCount();

  /// Cantidad de no leídas que se actualiza sola. Emite el valor actual al
  /// suscribirse y de nuevo con cada llegada en vivo y cada marcado como leída.
  /// Termina cuando el repositorio se cierra.
  Stream<int> watchUnreadCount();

  Future<void> markAsRead(String id);

  Future<void> markAllAsRead();

  Future<NotificationPreferences> fetchPreferences();

  Future<void> savePreferences(NotificationPreferences preferences);

  /// Notificaciones que llegan mientras la app está abierta
  /// (SSE o Socket.IO en producción). Termina cuando el repositorio se cierra.
  Stream<AppNotification> live();
}
