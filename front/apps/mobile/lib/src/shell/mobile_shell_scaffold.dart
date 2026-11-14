import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:ui/ui.dart';

/// Most destinations shown in the bottom navigation. The rest go under "Más".
const int maxPrimaryDestinations = 5;

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
        final locale = Localizations.localeOf(context);
        final entries = host.menu;
        final overflowing = entries.length > maxPrimaryDestinations;
        final primary = overflowing
            ? entries.take(maxPrimaryDestinations - 1).toList()
            : entries;
        final overflow = overflowing
            ? entries.skip(maxPrimaryDestinations - 1).toList()
            : const <MenuEntry>[];

        final destinations = [
          for (final entry in primary)
            AdaptiveDestination(
              label: entry.label.resolve(locale),
              icon: entry.icon,
              selectedIcon: entry.selectedIcon,
              badgeCount: host.badgeFor(entry),
            ),
          if (overflow.isNotEmpty)
            AdaptiveDestination(label: l10n.menuMore, icon: Icons.more_horiz),
        ];

        var selected = primary.indexWhere((e) => location.startsWith(e.path));
        if (selected < 0 && overflow.any((e) => location.startsWith(e.path))) {
          selected = primary.length;
        }
        if (selected < 0) selected = 0;

        // No top bar here: each screen draws its own with AppPage, which shows
        // the sign-out action that ShellChrome publishes on compact widths.
        return ShellChrome(
          destinations: destinations,
          selectedIndex: selected,
          actions: [
            IconButton(
              tooltip: l10n.actionSignOut,
              icon: const Icon(Icons.logout),
              onPressed: () => host.signOut(),
            ),
          ],
          body: child,
          onSelected: (index) {
            if (index == primary.length && overflow.isNotEmpty) {
              _showOverflow(context, overflow, locale);
            } else {
              host.router.go(primary[index].path);
            }
          },
        );
      },
    );
  }

  void _showOverflow(
    BuildContext context,
    List<MenuEntry> overflow,
    Locale locale,
  ) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in overflow)
              ListTile(
                leading: Icon(entry.icon),
                title: Text(entry.label.resolve(locale)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  host.router.go(entry.path);
                },
              ),
          ],
        ),
      ),
    );
  }
}
