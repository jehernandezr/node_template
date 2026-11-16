import 'dart:async';

import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_repository.dart';
import 'package:mf_notifications/src/shared/types/types.dart';

/// Repository whose answers wait for a gate, so a test decides the order in
/// which they arrive. Everything else goes to [inner].
///
/// Each call reads its gate when it starts: a test can put a new gate in
/// place between two calls. A null gate lets the call through.
final class GatedNotificationsRepository implements NotificationsRepository {
  /// Wraps [inner].
  GatedNotificationsRepository(this.inner);

  /// The demo repository that answers once a gate opens.
  final FakeNotificationsRepository inner;

  /// Gate of [fetchInbox].
  Completer<void>? fetchGate;

  /// Gate of [markAsRead] and [markAllAsRead].
  Completer<void>? markGate;

  /// Gate of [savePreferences].
  Completer<void>? saveGate;

  /// Every preferences passed to [savePreferences], in call order.
  final List<NotificationPreferences> saved = [];

  /// Adds [notification] to [inner] as a live arrival.
  void push(AppNotification notification) => inner.push(notification);

  @override
  Future<List<AppNotification>> fetchInbox() async {
    await _pass(fetchGate);
    return inner.fetchInbox();
  }

  @override
  Future<int> unreadCount() => inner.unreadCount();

  @override
  Stream<int> watchUnreadCount() => inner.watchUnreadCount();

  @override
  Future<void> markAsRead(String id) async {
    await _pass(markGate);
    return inner.markAsRead(id);
  }

  @override
  Future<void> markAllAsRead() async {
    await _pass(markGate);
    return inner.markAllAsRead();
  }

  @override
  Future<NotificationPreferences> fetchPreferences() =>
      inner.fetchPreferences();

  @override
  Future<void> savePreferences(NotificationPreferences preferences) async {
    saved.add(preferences);
    await _pass(saveGate);
    return inner.savePreferences(preferences);
  }

  @override
  Stream<AppNotification> live() => inner.live();

  @override
  Future<void> dispose() => inner.dispose();

  static Future<void> _pass(Completer<void>? gate) async {
    if (gate != null) await gate.future;
  }
}
