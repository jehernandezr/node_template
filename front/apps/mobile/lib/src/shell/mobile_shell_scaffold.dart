import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'menu_icons.dart';

/// Most destinations shown in the bottom navigation. The rest go under "Más".
const int maxPrimaryDestinations = 5;

/// Shell around the microfrontend pages. Screens own the only top bar
/// ([AppPage]); this scaffold only adds the navigation and publishes the
/// sign-out action through [ShellChrome].
class MobileShellScaffold extends StatelessWidget {
  /// Creates the scaffold around [child], the page of the matched route.
  const MobileShellScaffold({
    super.key,
    required this.registry,
    required this.session,
    required this.unreadCount,
    required this.onSignOut,
    required this.child,
  });

  /// Source of the visible menu entries.
  final MicrofrontendRegistry registry;

  /// Session that decides the menu.
  final ValueNotifier<UserSession> session;

  /// Unread notifications, shown as a badge on the notifications entry.
  final ValueNotifier<int> unreadCount;

  /// Ends the session and goes to the login page.
  final Future<void> Function() onSignOut;

  /// Page of the matched microfrontend route.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final l10n = AppLocalizations.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([session, unreadCount]),
      builder: (context, _) {
        final entries = registry.menuFor(session.value, AppPlatform.mobile);
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
              label: menuLabel(l10n, entry.labelKey),
              icon: menuIcon(MicrofrontendIdPath.fromPath(entry.path)),
              badgeCount: _idOf(entry) == MicrofrontendId.notifications
                  ? unreadCount.value
                  : null,
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
          actions: [_signOutButton(l10n)],
          body: child,
          onSelected: (index) {
            if (index == primary.length && overflow.isNotEmpty) {
              _showOverflow(context, overflow, l10n);
            } else {
              GoRouter.of(context).go(primary[index].path);
            }
          },
        );
      },
    );
  }

  IconButton _signOutButton(AppLocalizations l10n) => IconButton(
    tooltip: l10n.actionSignOut,
    icon: const Icon(Icons.logout),
    onPressed: () => onSignOut(),
  );

  static MicrofrontendId? _idOf(MenuEntry entry) =>
      MicrofrontendIdPath.fromPath(entry.path);

  void _showOverflow(BuildContext context, List<MenuEntry> overflow, AppLocalizations l10n) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in overflow)
              ListTile(
                leading: Icon(menuIcon(_idOf(entry))),
                title: Text(menuLabel(l10n, entry.labelKey)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  GoRouter.of(context).go(entry.path);
                },
              ),
          ],
        ),
      ),
    );
  }
}
