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
        final locale = Localizations.localeOf(context);
        final entries = host.menu;
        final current = host.registry.manifestForPath(location)?.id;
        final selected = entries.indexWhere(
          (entry) => host.registry.manifestForPath(entry.path)?.id == current,
        );
        // No top bar here: each screen draws its own with AppPage, and gets
        // the sign-out action from ShellChrome where the rail is not shown.
        return ShellChrome(
          selectedIndex: selected < 0 ? 0 : selected,
          onSelected: (index) => host.router.go(entries[index].path),
          destinations: [
            for (final entry in entries)
              AdaptiveDestination(
                label: entry.label.resolve(locale),
                icon: entry.icon,
                selectedIcon: entry.selectedIcon,
                badgeCount: host.badgeFor(entry),
              ),
          ],
          actions: [
            IconButton(
              tooltip: l10n.actionSignOut,
              icon: const Icon(Icons.logout),
              onPressed: () => host.signOut(),
            ),
          ],
          body: child,
        );
      },
    );
  }
}
