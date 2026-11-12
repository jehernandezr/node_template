import 'notification_models.dart';

/// Puerto de datos de notificaciones. La implementación real habla con la API;
/// [FakeNotificationsRepository] la sustituye en pruebas y en desarrollo.
abstract interface class NotificationsRepository {
  /// Bandeja del usuario, la más reciente primero.
  Future<List<AppNotification>> fetchInbox();

  /// Cantidad de notificaciones no leídas.
  Future<int> unreadCount();

  /// Cantidad de no leídas que se actualiza sola. Emite el valor actual al
  /// suscribirse y de nuevo con cada llegada en vivo y cada marcado como leída.
  Stream<int> watchUnreadCount();

  Future<void> markAsRead(String id);

  Future<void> markAllAsRead();

  Future<NotificationPreferences> fetchPreferences();

  Future<void> savePreferences(NotificationPreferences preferences);

  /// Notificaciones que llegan mientras la app está abierta
  /// (SSE o Socket.IO en producción).
  Stream<AppNotification> live();
}
