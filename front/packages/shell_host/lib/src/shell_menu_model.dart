import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'shell_destination.dart';

/// What a scaffold draws, decided once and tested without widgets.
///
/// The selected entry is the one with the longest path that matches the
/// location on a segment boundary (`/tasks2` does not select `/tasks`, and
/// `/tasks/42` does).
final class ShellMenuModel {
  /// Model of the menu over the destinations the user may see.
  ShellMenuModel({
    required List<MenuEntry> entries,
    required String location,
    required String languageCode,
    required int? Function(MenuEntry entry) badgeFor,
    this.maxPrimary = 4,
  }) {
    final loc = Uri.parse(location).path;
    final locale = Locale(languageCode);

    final destinations = [
      for (final entry in entries)
        ShellDestination(
          path: entry.path,
          label: entry.label.resolve(locale),
          icon: entry.icon,
          selectedIcon: entry.selectedIcon,
          badge: badgeFor(entry),
        ),
    ];

    final split = entries.length > maxPrimary;
    _primary = List.unmodifiable(
      split ? destinations.sublist(0, maxPrimary) : destinations,
    );
    _overflow = List.unmodifiable(
      split ? destinations.sublist(maxPrimary) : const <ShellDestination>[],
    );

    var matched = -1;
    var matchedLength = -1;
    for (var i = 0; i < entries.length; i++) {
      final path = entries[i].path;
      final matches = path == loc || loc.startsWith('$path/');
      if (matches && path.length > matchedLength) {
        matched = i;
        matchedLength = path.length;
      }
    }

    _selectedIndex = switch (matched) {
      -1 => -1,
      final index when index < _primary.length => index,
      _ => _primary.length,
    };
  }

  /// Most destinations in [primary]. With more entries than this, the rest go
  /// to [overflow] and the bar gets one more slot for "More".
  final int maxPrimary;

  late final List<ShellDestination> _primary;
  late final List<ShellDestination> _overflow;
  late final int _selectedIndex;

  /// Destinations shown in the main navigation.
  List<ShellDestination> get primary => _primary;

  /// Destinations that go under the overflow entry.
  List<ShellDestination> get overflow => _overflow;

  /// Whether there are destinations under the overflow entry.
  bool get hasOverflow => _overflow.isNotEmpty;

  /// Index in [primary]; `primary.length` (the "More" slot) when the selection
  /// is in [overflow]; -1 when nothing matches.
  int get selectedIndex => _selectedIndex;

  /// Path to open for the slot at [index], or null for the "More" slot and
  /// for an index out of range.
  String? pathAt(int index) =>
      index >= 0 && index < _primary.length ? _primary[index].path : null;
}
