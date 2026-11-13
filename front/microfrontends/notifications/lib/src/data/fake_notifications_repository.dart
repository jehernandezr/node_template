import 'dart:async';

import '../shared/types/types.dart';
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

  /// Si no es null, [markAsRead] y [markAllAsRead] fallan con este error.
  Object? markError;

  /// Si no es null, [savePreferences] falla con este error.
  Object? saveError;

  final List<AppNotification> _inbox;
  NotificationPreferences _preferences;
  final StreamController<AppNotification> _live =
      StreamController<AppNotification>.broadcast();
  // Avisa cada vez que cambia la bandeja: llegada en vivo o marcado como leída.
  final StreamController<void> _changes = StreamController<void>.broadcast();
  // Streams de [watchUnreadCount] abiertos, para cerrarlos en [dispose].
  final Set<StreamController<int>> _counts = {};
  bool _disposed = false;

  /// Si ya se llamó a [dispose].
  bool get isDisposed => _disposed;

  /// Agrega [notification] al inicio de la bandeja y la emite por [live].
  /// No hace nada después de [dispose].
  void push(AppNotification notification) {
    if (_disposed) return;
    _inbox.insert(0, notification);
    _live.add(notification);
    _changes.add(null);
  }

  /// Cierra [live], [watchUnreadCount] y sus suscripciones internas. Lo llama
  /// el scope de la identidad; llamarlo otra vez no hace nada.
  @override
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    final counts = List.of(_counts);
    _counts.clear();
    // Sin esperar a los oyentes: un stream cerrado sin suscriptor no termina.
    for (final controller in counts) {
      unawaited(controller.close());
    }
    await _live.close();
    await _changes.close();
  }

  int _unreadNow() => _inbox.where((notification) => !notification.read).length;

  void _notifyChanged() {
    if (!_disposed) _changes.add(null);
  }

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
    if (_disposed) return const Stream<int>.empty();
    StreamSubscription<void>? changes;
    late final StreamController<int> counts;
    counts = StreamController<int>(
      onListen: () {
        counts.add(_unreadNow());
        changes = _changes.stream.listen((_) => counts.add(_unreadNow()));
      },
      onCancel: () {
        _counts.remove(counts);
        return changes?.cancel();
      },
    );
    _counts.add(counts);
    return counts.stream;
  }

  @override
  Future<void> markAsRead(String id) async {
    await _delayed(null);
    final error = markError;
    if (error != null) throw error;
    final index = _inbox.indexWhere((notification) => notification.id == id);
    if (index == -1) return;
    _inbox[index] = _inbox[index].copyWith(read: true);
    _notifyChanged();
  }

  @override
  Future<void> markAllAsRead() async {
    await _delayed(null);
    final error = markError;
    if (error != null) throw error;
    for (var i = 0; i < _inbox.length; i++) {
      _inbox[i] = _inbox[i].copyWith(read: true);
    }
    _notifyChanged();
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
