import 'package:material_ui/material_ui.dart';

import 'shell_context.dart';
import 'shell_event_bus.dart';

/// Text of a menu entry in each language the shells support.
///
/// It travels with the eager manifest, so the shell can draw the menu before
/// any microfrontend library loads. The registry rejects a label that lacks
/// a supported language.
@immutable
final class MenuLabel {
  /// Creates a label from texts keyed by language code, for example
  /// `{'es': 'Tareas', 'en': 'Tasks'}`.
  const MenuLabel(this.byLanguage);

  /// Text per language code.
  final Map<String, String> byLanguage;

  /// Text for [locale]: its language, or the first one declared.
  String resolve(Locale locale) =>
      byLanguage[locale.languageCode] ?? byLanguage.values.first;
}

/// Count shown on a menu entry, taken from the latest event of type [E].
///
/// [E] is replayable, so a menu built after the event still shows the count.
/// The microfrontend that owns the event declares the badge; the shell only
/// draws the number.
final class MenuBadge<E extends ReplayableShellEvent> {
  /// Creates a badge that reads the count of each [E] with [count].
  const MenuBadge(this._count);

  final int Function(E event) _count;

  /// Counts published on [bus], starting with the replayed one if any.
  Stream<int> watch(ShellEventBus bus) =>
      bus.on<E>(replay: true).map((event) => _count(event));
}

/// Menu item a microfrontend contributes to the shell navigation.
@immutable
final class MenuEntry {
  /// Creates a menu entry.
  const MenuEntry({
    required this.label,
    required this.path,
    required this.order,
    required this.icon,
    IconData? selectedIcon,
    this.badge,
  }) : selectedIcon = selectedIcon ?? icon;

  /// Text of the entry.
  final MenuLabel label;

  /// Absolute route path the entry navigates to.
  final String path;

  /// Sort position; lower values come first.
  final int order;

  /// Icon of the entry.
  final IconData icon;

  /// Icon while the entry is selected. Defaults to [icon].
  final IconData selectedIcon;

  /// Count drawn on the entry, or null for none.
  final MenuBadge? badge;
}

/// Optional lifecycle hooks of a microfrontend.
///
/// [ShellRuntime] calls [initialize] when the microfrontend becomes visible to
/// the current user, and [dispose] before it stops being visible or the user
/// or tenant changes.
///
/// Declare it in the manifest with `lifecycleFactory`: the runtime then builds
/// a new instance for every activation, so no state is shared between
/// identities or between runtimes. Publish events with [ShellContext.emit], so
/// an event sent after the identity changed is dropped.
abstract class Microfrontend {
  /// Creates a lifecycle object. Subclasses may be const.
  const Microfrontend();

  /// Starts the microfrontend for the current session. Default: no-op.
  ///
  /// If it throws, the runtime disposes it and retries on a later sync, after
  /// a backoff (see `ShellRuntime.lifecycleRetryDelay`).
  Future<void> initialize(ShellContext context) async {}

  /// Releases resources. Default: no-op.
  Future<void> dispose() async {}
}
