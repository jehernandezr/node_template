import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../shared/types/types.dart';

/// State and actions of the inbox.
///
/// Live arrivals that come before the first load ends wait in the controller
/// and join the list when it loads. A failed save reverts only the `read` flag
/// of the affected ids, never the list.
final class InboxController extends ChangeNotifier {
  InboxController(this._repository);

  final NotificationsRepository _repository;
  final ActionRunner _runner = ActionRunner(
    concurrency: ActionConcurrency.parallel,
  );
  // Arrivals received while the inbox has no data, newest first.
  final List<AppNotification> _arrivals = [];

  AsyncValue<List<AppNotification>> _inbox = const AsyncValue.loading();
  int _requestId = 0;
  StreamSubscription<AppNotification>? _liveSubscription;
  bool _disposed = false;

  /// Inbox, newest first: loading, loaded or failed.
  AsyncValue<List<AppNotification>> get inbox => _inbox;

  /// Number of unread notifications in [inbox]; zero while it has no data.
  int get unreadCount => (_inbox.valueOrNull ?? const <AppNotification>[])
      .where((notification) => !notification.read)
      .length;

  /// Loads the inbox and starts listening to live arrivals. Calling it again
  /// reloads; the answer of an older call is dropped, so two loads never
  /// merge into one list.
  Future<void> start() async {
    if (_disposed) return;
    _liveSubscription ??= _repository.live().listen(_onLive);
    final id = ++_requestId;
    _emit(const AsyncValue.loading());
    final result = await AsyncValue.guard(_repository.fetchInbox);
    if (_disposed || id != _requestId) return;
    _emit(switch (result) {
      AsyncData(value: final fetched) => AsyncValue.data(_merge(fetched)),
      _ => result,
    });
  }

  /// Marks [id] as read. Skipped when it is already read or unknown.
  Future<ActionResult<void>> markRead(String id) async {
    final target = _inbox.valueOrNull?.where((n) => n.id == id).firstOrNull;
    if (target == null || target.read) return const ActionSkipped<void>();
    return _saveRead({id}, () => _repository.markAsRead(id));
  }

  /// Marks every notification as read. Skipped when none is unread.
  Future<ActionResult<void>> markAllRead() async {
    final items = _inbox.valueOrNull;
    if (items == null) return const ActionSkipped<void>();
    final ids = {
      for (final n in items)
        if (!n.read) n.id,
    };
    if (ids.isEmpty) return const ActionSkipped<void>();
    return _saveRead(ids, _repository.markAllAsRead);
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_liveSubscription?.cancel());
    _runner.dispose();
    super.dispose();
  }

  /// Joins the arrivals that waited for [fetched] to load.
  List<AppNotification> _merge(List<AppNotification> fetched) {
    final arrivalIds = _arrivals.map((n) => n.id).toSet();
    final merged = [
      ..._arrivals,
      ...fetched.where((n) => !arrivalIds.contains(n.id)),
    ];
    _arrivals.clear();
    return merged;
  }

  void _onLive(AppNotification notification) {
    final items = _inbox.valueOrNull;
    if (items == null) {
      if (!_arrivals.any((a) => a.id == notification.id)) {
        _arrivals.insert(0, notification);
      }
      return;
    }
    if (items.any((n) => n.id == notification.id)) return;
    _emit(AsyncValue.data([notification, ...items]));
  }

  Future<ActionResult<void>> _saveRead(
    Set<String> ids,
    Future<void> Function() save,
  ) async {
    _setRead(ids, read: true);
    final result = await _runner.run(save);
    if (!_disposed && result is ActionFailed<void>) {
      _setRead(ids, read: false);
    }
    return result;
  }

  // Reverts from the current list, never from a copy taken before the save:
  // an arrival that came in while saving must survive a failure.
  void _setRead(Set<String> ids, {required bool read}) {
    final items = _inbox.valueOrNull;
    if (items == null) return;
    _emit(
      AsyncValue.data([
        for (final n in items) ids.contains(n.id) ? n.copyWith(read: read) : n,
      ]),
    );
  }

  void _emit(AsyncValue<List<AppNotification>> next) {
    _inbox = next;
    if (!_disposed) notifyListeners();
  }
}
