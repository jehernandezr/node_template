import 'dart:async';

import 'notification_models.dart';
import 'notifications_repository.dart';

/// Repositorio en memoria. [push] simula una notificación que llega en vivo.
final class FakeNotificationsRepository implements NotificationsRepository {
  FakeNotificationsRepository({
    List<AppNotification>? seed,
    NotificationPreferences? preferences,
    this.latency = Duration.zero,
  }) : _inbox = List.of(seed ?? _sampleInbox()),
       _preferences = preferences ?? NotificationPreferences.defaults();

  /// Retraso artificial de cada lectura, útil para probar el estado de carga.
  final Duration latency;

  /// Si no es null, [fetchInbox] falla con este error.
  Object? fetchError;

  /// Si no es null, [savePreferences] falla con este error.
  Object? saveError;

  final List<AppNotification> _inbox;
  NotificationPreferences _preferences;
  final StreamController<AppNotification> _live =
      StreamController<AppNotification>.broadcast();
  // Avisa cada vez que cambia la bandeja: llegada en vivo o marcado como leída.
  final StreamController<void> _changes = StreamController<void>.broadcast();

  /// Agrega [notification] al inicio de la bandeja y la emite por [live].
  void push(AppNotification notification) {
    _inbox.insert(0, notification);
    _live.add(notification);
    _changes.add(null);
  }

  /// Cierra los streams. Llamarlo al terminar la prueba o al liberar el scope.
  Future<void> close() async {
    await _live.close();
    await _changes.close();
  }

  int _unreadNow() => _inbox.where((notification) => !notification.read).length;

  Future<T> _delayed<T>(T value) async {
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    return value;
  }

  @override
  Future<List<AppNotification>> fetchInbox() async {
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    final error = fetchError;
    if (error != null) throw error;
    return List.unmodifiable(_inbox);
  }

  @override
  Future<int> unreadCount() => _delayed(_unreadNow());

  @override
  Stream<int> watchUnreadCount() {
    StreamSubscription<void>? changes;
    late final StreamController<int> counts;
    counts = StreamController<int>(
      onListen: () {
        counts.add(_unreadNow());
        changes = _changes.stream.listen((_) => counts.add(_unreadNow()));
      },
      onCancel: () => changes?.cancel(),
    );
    return counts.stream;
  }

  @override
  Future<void> markAsRead(String id) async {
    final index = _inbox.indexWhere((notification) => notification.id == id);
    if (index == -1) return;
    _inbox[index] = _inbox[index].copyWith(read: true);
    _changes.add(null);
    return _delayed(null);
  }

  @override
  Future<void> markAllAsRead() {
    for (var i = 0; i < _inbox.length; i++) {
      _inbox[i] = _inbox[i].copyWith(read: true);
    }
    _changes.add(null);
    return _delayed(null);
  }

  @override
  Future<NotificationPreferences> fetchPreferences() => _delayed(_preferences);

  @override
  Future<void> savePreferences(NotificationPreferences preferences) {
    final error = saveError;
    if (error != null) return Future<void>.error(error);
    _preferences = preferences;
    return _delayed(null);
  }

  @override
  Stream<AppNotification> live() => _live.stream;

  static List<AppNotification> _sampleInbox() => [
    AppNotification(
      id: 'n-3',
      type: NotificationType.invoiceIssued,
      title: 'Factura emitida',
      body: 'Tu factura de octubre ya está disponible.',
      createdAt: DateTime(2026, 11, 10, 9, 30),
    ),
    AppNotification(
      id: 'n-2',
      type: NotificationType.taskUpdated,
      title: 'Tarea actualizada',
      body: 'Revisar contrato cambió a En progreso.',
      createdAt: DateTime(2026, 11, 9, 16, 5),
      read: true,
    ),
    AppNotification(
      id: 'n-1',
      type: NotificationType.securityAlert,
      title: 'Nuevo inicio de sesión',
      body: 'Iniciaste sesión desde un dispositivo nuevo.',
      createdAt: DateTime(2026, 11, 8, 21, 14),
    ),
  ];
}
