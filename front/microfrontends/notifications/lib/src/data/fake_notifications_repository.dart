import 'dart:async';

import 'package:shell_core/shell_core.dart';

import '../shared/types/types.dart';
import 'notifications_repository.dart';

/// In-memory repository for the demo mode and the tests. [push] simulates a
/// notification that arrives while the app is open.
///
/// Fires on every change of the inbox: a live arrival or a read mark.
///
/// Open streams from [watchUnreadCount], closed by [dispose].
final class FakeNotificationsRepository implements NotificationsRepository {
  /// Demo repository with sample notifications and the failures of `DemoBehavior`.
  FakeNotificationsRepository({
    List<AppNotification>? seed,
    NotificationPreferences? preferences,
    DemoBehavior? behavior,
  }) : _behavior = behavior ?? DemoBehavior(),
       _inbox = List.of(seed ?? _sampleInbox()),
       _preferences = preferences ?? NotificationPreferences.defaults();

  final DemoBehavior _behavior;
  final List<AppNotification> _inbox;
  NotificationPreferences _preferences;
  final StreamController<AppNotification> _live =
      StreamController<AppNotification>.broadcast();
  final StreamController<void> _changes = StreamController<void>.broadcast();
  final Set<StreamController<int>> _counts = {};

  /// Whether [dispose] already ran.
  bool get isDisposed => _behavior.isDisposed;

  /// Adds [notification] to the top of the inbox and emits it on [live].
  /// Does nothing after [dispose].
  void push(AppNotification notification) {
    if (isDisposed) return;
    _inbox.insert(0, notification);
    _live.add(notification);
    _changes.add(null);
  }

  /// Closes [live], [watchUnreadCount] and their internal subscriptions. The
  /// identity scope calls it; calling it again does nothing.
  ///
  /// Not waiting for the listeners: a stream with no subscriber never ends.
  @override
  Future<void> dispose() async {
    if (_behavior.isDisposed) return;
    _behavior.dispose();
    final counts = List.of(_counts);
    _counts.clear();
    for (final controller in counts) {
      unawaited(controller.close());
    }
    await _live.close();
    await _changes.close();
  }

  int _unreadNow() => _inbox.where((notification) => !notification.read).length;

  void _notifyChanged() {
    if (!isDisposed) _changes.add(null);
  }

  @override
  Future<List<AppNotification>> fetchInbox() => _behavior.respond(
    () => List<AppNotification>.unmodifiable(_inbox),
    operation: NotificationsOperation.fetchInbox,
  );

  @override
  Future<int> unreadCount() => _behavior.respond(
    _unreadNow,
    operation: NotificationsOperation.unreadCount,
  );

  @override
  Stream<int> watchUnreadCount() {
    if (isDisposed) return const Stream<int>.empty();
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
  Future<void> markAsRead(String id) => _behavior.respond(() {
    final index = _inbox.indexWhere((notification) => notification.id == id);
    if (index == -1) return;
    _inbox[index] = _inbox[index].copyWith(read: true);
    _notifyChanged();
  }, operation: NotificationsOperation.markAsRead);

  @override
  Future<void> markAllAsRead() => _behavior.respond(() {
    for (var i = 0; i < _inbox.length; i++) {
      _inbox[i] = _inbox[i].copyWith(read: true);
    }
    _notifyChanged();
  }, operation: NotificationsOperation.markAllAsRead);

  @override
  Future<NotificationPreferences> fetchPreferences() => _behavior.respond(
    () => _preferences,
    operation: NotificationsOperation.fetchPreferences,
  );

  @override
  Future<void> savePreferences(NotificationPreferences preferences) =>
      _behavior.respond(() {
        _preferences = preferences;
      }, operation: NotificationsOperation.savePreferences);

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
