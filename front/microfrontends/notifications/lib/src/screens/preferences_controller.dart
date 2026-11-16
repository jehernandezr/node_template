import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../shared/types/types.dart';

/// State and actions of the preferences page.
///
/// Every change shows at once and is saved one at a time, in order, each save
/// carrying the whole preferences. If a save fails and no newer change exists,
/// the preferences go back to the last saved ones; if a newer change exists,
/// its save carries the failed change along and nothing is undone.
final class PreferencesController extends ChangeNotifier {
  PreferencesController(NotificationsRepository repository)
    : _repository = repository,
      _loader = AsyncLoader<NotificationPreferences>(
        repository.fetchPreferences,
      ) {
    _loader.addListener(notifyListeners);
  }

  final NotificationsRepository _repository;
  final AsyncLoader<NotificationPreferences> _loader;
  final ActionRunner _runner = ActionRunner(
    concurrency: ActionConcurrency.serial,
  );

  // Last preferences loaded or saved successfully.
  NotificationPreferences? _confirmed;
  // Counts every change; a failed save compares it to know it is the newest.
  int _version = 0;
  bool _disposed = false;

  /// Preferences: loading, loaded or failed.
  AsyncValue<NotificationPreferences> get preferences => _loader.value;

  /// Loads the preferences. Calling it again reloads.
  Future<void> start() async {
    final version = _version;
    await _loader.load();
    // A change made while loading is not a saved value.
    if (_disposed || version != _version) return;
    _confirmed = _loader.value.valueOrNull ?? _confirmed;
  }

  /// Turns [channel] of [type] on or off and saves. Skipped for a mandatory
  /// type or when the preferences are not loaded.
  Future<ActionResult<void>> setChannel(
    NotificationType type,
    NotificationChannel channel, {
    required bool enabled,
  }) => _change((current) => current.withChannel(type, channel, enabled));

  /// Sets the start of the quiet hours and saves.
  Future<ActionResult<void>> setQuietStart(ClockTime time) =>
      _change((current) => current.withQuietHours(start: time));

  /// Sets the end of the quiet hours and saves.
  Future<ActionResult<void>> setQuietEnd(ClockTime time) =>
      _change((current) => current.withQuietHours(end: time));

  @override
  void dispose() {
    _disposed = true;
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }

  Future<ActionResult<void>> _change(
    NotificationPreferences Function(NotificationPreferences current) edit,
  ) async {
    final current = _loader.value.valueOrNull;
    if (current == null) return const ActionSkipped<void>();
    final next = edit(current);
    // The model returns the same object for a mandatory combination.
    if (identical(next, current)) return const ActionSkipped<void>();
    final version = ++_version;
    _loader.setData(next);
    final result = await _runner.run(() => _repository.savePreferences(next));
    if (_disposed) return result;
    switch (result) {
      case ActionSucceeded<void>():
        _confirmed = next;
        return result;
      case ActionFailed<void>() when version != _version:
        // A newer save carries this change too, so reverting would undo it.
        return const ActionSkipped<void>();
      case ActionFailed<void>():
        _loader.setData(_confirmed ?? current);
        return result;
      case ActionSkipped<void>():
        return result;
    }
  }
}
