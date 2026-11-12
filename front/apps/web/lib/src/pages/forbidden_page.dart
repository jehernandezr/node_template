import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Shown when the signed-in user cannot see the requested page, or has nothing
/// to show. Offers a way home and a way out, so a user is never stuck here.
class ForbiddenPage extends StatelessWidget {
  const ForbiddenPage({super.key, required this.onSignOut});

  /// Ends the session and goes to login.
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: EmptyState(
              icon: Icons.block,
              title: l10n.forbiddenTitle,
              message: l10n.forbiddenMessage,
              actionLabel: l10n.goHome,
              onAction: () => context.go('/'),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320),
                child: AppButton(
                  label: l10n.actionSignOut,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => onSignOut(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
