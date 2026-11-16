import 'dart:async';

import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_host/shell_host.dart';
import 'package:ui/ui.dart';

/// Frame around every microfrontend route: navigation built from the menu the
/// session can see, with sign-out and the badges the microfrontends publish.
/// Screens own the only top bar ([AppPage]); the shell never draws one.
class WebShellScaffold extends StatelessWidget {
  const WebShellScaffold({
    super.key,
    required this.host,
    required this.location,
    required this.child,
  });

  final ShellHost host;

  /// Current path, used to select the destination.
  final String location;

  /// The microfrontend page.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([host.session, host.badges]),
      builder: (context, _) {
        final l10n = AppLocalizations.of(context);
        final entries = host.menu;
        // The web rail shows every entry: there is no "More" slot.
        final menu = ShellMenuModel(
          entries: entries,
          location: location,
          languageCode: Localizations.localeOf(context).languageCode,
          badgeFor: host.badgeFor,
          maxPrimary: entries.length,
        );
        // No top bar here: each screen draws its own with AppPage, and gets
        // the sign-out action from ShellChrome where the rail is not shown.
        return ShellChrome(
          selectedIndex: menu.selectedIndex < 0 ? 0 : menu.selectedIndex,
          onSelected: (index) {
            final path = menu.pathAt(index);
            if (path != null) host.router.go(path);
          },
          destinations: [
            for (final destination in menu.primary)
              AdaptiveDestination(
                label: destination.label,
                icon: destination.icon,
                selectedIcon: destination.selectedIcon,
                badgeCount: destination.badge,
              ),
          ],
          actions: [
            IconButton(
              tooltip: l10n.actionSignOut,
              icon: const Icon(Icons.logout),
              onPressed: () => unawaited(host.signOut()),
            ),
          ],
          body: child,
        );
      },
    );
  }
}
