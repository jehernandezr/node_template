import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';

/// Shown when a signed-in user opens a section the plan or role does not include.
/// Offers a way home and sign-out, so the user is never stuck here.
class ForbiddenPage extends StatelessWidget {
  /// Creates the page. [onSignOut] ends the session and goes to login.
  const ForbiddenPage({super.key, required this.onSignOut});

  /// Ends the session and goes to the login page.
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  l10n.forbiddenTitle,
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(l10n.forbiddenMessage, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => GoRouter.of(context).go('/'),
                  child: Text(l10n.goHome),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => onSignOut(),
                  child: Text(l10n.actionSignOut),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
