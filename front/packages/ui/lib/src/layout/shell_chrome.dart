import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

import 'adaptive_scaffold.dart';
import 'breakpoint.dart';

/// Navigation frame of a shell around the page of the current route.
///
/// It never draws a top bar: each screen owns the only one, with [AppPage].
/// - With two or more [destinations]: a bottom [NavigationBar] on compact
///   widths and a [NavigationRail] on wider ones, with [actions] at the bottom
///   of the rail.
/// - With fewer: only [body].
///
/// Where the rail does not show [actions] (compact widths, or no
/// navigation), they are published to the pages below, and [AppPage] adds
/// them to its top bar. Read them with [ShellChrome.pageActionsOf].
class ShellChrome extends StatelessWidget {
  /// Creates the frame around [body].
  const ShellChrome({
    super.key,
    required this.destinations,
    required this.selectedIndex,
    required this.onSelected,
    required this.body,
    this.actions = const [],
  });

  /// Navigation entries, in display order.
  final List<AdaptiveDestination> destinations;

  /// Index of the selected entry in [destinations]. Ignored with fewer than
  /// two destinations.
  final int selectedIndex;

  /// Called with the index of the entry the user taps.
  final ValueChanged<int> onSelected;

  /// Page of the current route.
  final Widget body;

  /// Shell-wide actions, such as sign-out. Usually icon buttons with tooltips.
  final List<Widget> actions;

  /// Actions the shell asks the current page to show in its top bar, or an
  /// empty list outside a [ShellChrome] or when the rail shows them.
  static List<Widget> pageActionsOf(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<_ShellChromeActions>()
          ?.actions ??
      const [];

  @override
  Widget build(BuildContext context) {
    final hasNavigation = destinations.length >= 2;
    final compact = Breakpoint.of(context) == Breakpoint.compact;
    final railShowsActions = hasNavigation && !compact;
    final page = _ShellChromeActions(
      actions: railShowsActions ? const [] : actions,
      child: body,
    );
    if (!hasNavigation) return page;

    return AdaptiveScaffold(
      destinations: destinations,
      selectedIndex: selectedIndex.clamp(0, destinations.length - 1),
      onSelected: onSelected,
      railTrailing: actions.isEmpty
          ? null
          : Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Column(mainAxisSize: MainAxisSize.min, children: actions),
            ),
      body: page,
    );
  }
}

final class _ShellChromeActions extends InheritedWidget {
  const _ShellChromeActions({required this.actions, required super.child});

  final List<Widget> actions;

  @override
  bool updateShouldNotify(_ShellChromeActions oldWidget) =>
      !_sameWidgets(oldWidget.actions, actions);

  static bool _sameWidgets(List<Widget> a, List<Widget> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!identical(a[i], b[i])) return false;
    }
    return true;
  }
}
