import 'dart:async';

import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_host/shell_host.dart';
import 'package:ui/ui.dart';

/// Shell around the microfrontend pages. Screens own the only top bar
/// ([AppPage]); this scaffold only adds the navigation and publishes the
/// sign-out action through [ShellChrome].
class MobileShellScaffold extends StatelessWidget {
  /// Creates the scaffold around [child], the page of the matched route.
  const MobileShellScaffold({
    super.key,
    required this.host,
    required this.location,
    required this.child,
  });

  /// Most destinations shown in the bottom navigation. The rest go under
  /// "Más".
  static const int maxPrimaryDestinations = 5;

  final ShellHost host;

  /// Current path, used to select the destination.
  final String location;

  /// Page of the matched microfrontend route.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([host.session, host.badges]),
      builder: (context, _) {
        final entries = host.menu;
        // The "More" slot takes one place of the bar, so a longer menu keeps
        // one entry fewer in the bar. A shorter one fills the bar as it is.
        final menu = ShellMenuModel(
          entries: entries,
          location: location,
          languageCode: Localizations.localeOf(context).languageCode,
          badgeFor: host.badgeFor,
          maxPrimary: entries.length > maxPrimaryDestinations
              ? maxPrimaryDestinations - 1
              : maxPrimaryDestinations,
        );

        // No top bar here: each screen draws its own with AppPage, which shows
        // the sign-out action that ShellChrome publishes on compact widths.
        return ShellChrome(
          destinations: [
            for (final destination in menu.primary)
              AdaptiveDestination(
                label: destination.label,
                icon: destination.icon,
                selectedIcon: destination.selectedIcon,
                badgeCount: destination.badge,
              ),
            if (menu.hasOverflow)
              AdaptiveDestination(label: l10n.menuMore, icon: Icons.more_horiz),
          ],
          selectedIndex: menu.selectedIndex < 0 ? 0 : menu.selectedIndex,
          actions: [
            IconButton(
              tooltip: l10n.actionSignOut,
              icon: const Icon(Icons.logout),
              onPressed: () => unawaited(host.signOut()),
            ),
          ],
          body: child,
          onSelected: (index) {
            final path = menu.pathAt(index);
            if (path != null) {
              host.router.go(path);
            } else if (menu.hasOverflow && index == menu.primary.length) {
              _showOverflow(context, menu.overflow);
            }
          },
        );
      },
    );
  }

  void _showOverflow(BuildContext context, List<ShellDestination> overflow) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final destination in overflow)
              ListTile(
                leading: Icon(destination.icon),
                title: Text(destination.label),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  host.router.go(destination.path);
                },
              ),
          ],
        ),
      ),
    );
  }
}
