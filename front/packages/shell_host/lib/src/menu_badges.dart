import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shell_core/shell_core.dart';

/// Count of each menu entry that declares a badge, fed by the replayable
/// events of its microfrontend.
final class MenuBadges {
  /// Starts following the badge of every entry of [registry] on [bus].
  MenuBadges({
    required MicrofrontendRegistry registry,
    required ShellEventBus bus,
  }) {
    for (final manifest in registry.manifests) {
      for (final entry in manifest.menu) {
        final badge = entry.badge;
        if (badge == null) continue;
        _subscriptions.add(
          badge.watch(bus).listen((count) {
            _counts.value = {..._counts.value, entry.path: count};
          }),
        );
      }
    }
  }

  final ValueNotifier<Map<String, int>> _counts = ValueNotifier(const {});
  final List<StreamSubscription<int>> _subscriptions = [];
  bool _disposed = false;

  /// Count of each entry with a badge, by entry path.
  ValueListenable<Map<String, int>> get counts => _counts;

  /// Count to draw on [entry], or null when it declares no badge.
  int? countFor(MenuEntry entry) =>
      entry.badge == null ? null : (_counts.value[entry.path] ?? 0);

  /// Back to empty, for a new identity.
  void reset() {
    if (_disposed) return;
    _counts.value = const {};
  }

  /// Stops following the bus and releases [counts].
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
    _counts.dispose();
  }
}
