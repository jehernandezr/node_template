import 'package:material_ui/material_ui.dart';

/// One entry of the navigation a scaffold draws.
final class ShellDestination {
  /// Destination of the menu with its icons and label.
  const ShellDestination({
    required this.path,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.badge,
  });

  /// Path the destination opens.
  final String path;

  /// Text already resolved for the current language.
  final String label;

  /// Icon when not selected.
  final IconData icon;

  /// Icon when selected.
  final IconData selectedIcon;

  /// Count to draw on the destination, or null for none.
  final int? badge;
}
