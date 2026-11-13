import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../navigation/shell_navigation.dart';
import '../web_shell.dart';

/// Frame around every microfrontend route: navigation built from the menu the
/// session can see, with sign-out and the unread badge. Screens own the only
/// top bar ([AppPage]); the shell never draws one.
class WebShellScaffold extends StatelessWidget {
  const WebShellScaffold({
    super.key,
    required this.shell,
    required this.location,
    required this.child,
  });

  final WebShell shell;

  /// Current path, used to select the destination.
  final String location;

  /// The microfrontend page.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([shell.session, shell.unreadCount]),
      builder: (context, _) {
        final l10n = AppLocalizations.of(context);
        final entries = shell.registry.menuFor(shell.session.value, AppPlatform.web);
        final signOutButton = IconButton(
          tooltip: l10n.actionSignOut,
          icon: const Icon(Icons.logout),
          onPressed: () => shell.signOut(),
        );

        final current = MicrofrontendIdPath.fromPath(location);
        final selected = entries.indexWhere(
          (entry) => MicrofrontendIdPath.fromPath(entry.path) == current,
        );
        // No top bar here: each screen draws its own with AppPage, and gets
        // the sign-out action from ShellChrome where the rail is not shown.
        return ShellChrome(
          selectedIndex: selected < 0 ? 0 : selected,
          onSelected: (index) => shell.router.go(entries[index].path),
          destinations: [
            for (final entry in entries) _destination(l10n, entry),
          ],
          actions: [signOutButton],
          body: child,
        );
      },
    );
  }

  AdaptiveDestination _destination(AppLocalizations l10n, MenuEntry entry) {
    final id = MicrofrontendIdPath.fromPath(entry.path);
    final icons = menuIcons(id);
    return AdaptiveDestination(
      label: menuLabel(l10n, entry.labelKey),
      icon: icons.outlined,
      selectedIcon: icons.filled,
      badgeCount: id == MicrofrontendId.notifications ? shell.unreadCount.value : null,
    );
  }
}
