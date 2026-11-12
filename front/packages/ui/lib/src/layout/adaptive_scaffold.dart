import 'package:material_ui/material_ui.dart';

import 'breakpoint.dart';

/// One navigation entry shown by [AdaptiveScaffold].
class AdaptiveDestination {
  /// Creates a destination with a [label] and an [icon].
  const AdaptiveDestination({
    required this.label,
    required this.icon,
    this.selectedIcon,
    this.badgeCount,
  });

  /// Text shown next to or under the icon.
  final String label;

  /// Icon used when the destination is not selected.
  final IconData icon;

  /// Icon used when the destination is selected. Defaults to [icon].
  final IconData? selectedIcon;

  /// Number shown in a badge on the icon. The badge is hidden when this is
  /// null or 0.
  final int? badgeCount;
}

/// Scaffold that shows a bottom [NavigationBar] on compact widths and a
/// [NavigationRail] on medium and expanded widths.
class AdaptiveScaffold extends StatelessWidget {
  /// Creates a scaffold. Needs at least two [destinations].
  const AdaptiveScaffold({
    super.key,
    required this.destinations,
    required this.selectedIndex,
    required this.onSelected,
    required this.body,
    this.appBar,
    this.railTrailing,
    this.compactActions,
  }) : assert(destinations.length >= 2),
       assert(selectedIndex >= 0 && selectedIndex < destinations.length);

  /// Navigation entries, in display order.
  final List<AdaptiveDestination> destinations;

  /// Index of the selected entry in [destinations].
  final int selectedIndex;

  /// Called with the index of the entry the user taps.
  final ValueChanged<int> onSelected;

  /// Content shown next to the navigation.
  final Widget body;

  /// Optional app bar placed above [body] on every width.
  ///
  /// On compact widths it takes precedence over [compactActions].
  final PreferredSizeWidget? appBar;

  /// Optional widget shown at the bottom of the rail on medium and expanded
  /// widths, for example a sign-out button.
  final Widget? railTrailing;

  /// Optional actions shown in a small top bar on compact widths only, for
  /// example a sign-out button. Ignored when [appBar] is set.
  final List<Widget>? compactActions;

  @override
  Widget build(BuildContext context) {
    final breakpoint = Breakpoint.of(context);
    if (breakpoint == Breakpoint.compact) {
      return Scaffold(
        appBar: appBar ?? _compactActionsBar(),
        body: body,
        bottomNavigationBar: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: onSelected,
          destinations: [
            for (final destination in destinations)
              NavigationDestination(
                label: destination.label,
                icon: _withBadge(
                  Icon(destination.icon),
                  destination.badgeCount,
                ),
                selectedIcon: _selectedIcon(destination),
              ),
          ],
        ),
      );
    }

    final extended = breakpoint == Breakpoint.expanded;
    return Scaffold(
      appBar: appBar,
      body: Row(
        children: [
          NavigationRail(
            extended: extended,
            labelType: extended
                ? NavigationRailLabelType.none
                : NavigationRailLabelType.all,
            selectedIndex: selectedIndex,
            onDestinationSelected: onSelected,
            trailing: railTrailing,
            destinations: [
              for (final destination in destinations)
                NavigationRailDestination(
                  label: Text(destination.label),
                  icon: _withBadge(
                    Icon(destination.icon),
                    destination.badgeCount,
                  ),
                  selectedIcon: _selectedIcon(destination),
                ),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(child: body),
        ],
      ),
    );
  }

  PreferredSizeWidget? _compactActionsBar() {
    final actions = compactActions;
    if (actions == null || actions.isEmpty) return null;
    return AppBar(
      toolbarHeight: 48,
      automaticallyImplyLeading: false,
      actions: actions,
    );
  }

  static Widget? _selectedIcon(AdaptiveDestination destination) {
    final icon = destination.selectedIcon;
    if (icon == null) {
      return destination.badgeCount == null
          ? null
          : _withBadge(Icon(destination.icon), destination.badgeCount);
    }
    return _withBadge(Icon(icon), destination.badgeCount);
  }

  static Widget _withBadge(Widget icon, int? count) {
    if (count == null || count == 0) return icon;
    return Badge.count(count: count, child: icon);
  }
}
