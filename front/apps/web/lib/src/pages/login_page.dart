import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../demo_sessions.dart';

/// DEMO sign-in: picks one of three demo sessions. No password is checked.
class LoginPage extends StatelessWidget {
  const LoginPage({super.key, required this.session, this.from});

  final ValueNotifier<UserSession> session;

  /// Location to return to after signing in, from the `from` query parameter.
  final String? from;

  void _signIn(BuildContext context, UserSession demo) {
    session.value = demo;
    context.go(safeDestination(from));
  }

  /// Only in-app paths are accepted, so `from` cannot send the user elsewhere.
  static String safeDestination(String? from) {
    if (from == null || !from.startsWith('/') || from.startsWith('//')) {
      return '/';
    }
    if (from.contains(r'\')) return '/';
    return from;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.actionSignIn,
                  style: theme.textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.demoModeTitle,
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.demoModeHint,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                AppButton(
                  label: l10n.demoSignInCustomer,
                  onPressed: () => _signIn(context, DemoSessions.customer()),
                ),
                const SizedBox(height: 12),
                AppButton(
                  label: l10n.demoSignInTenantAdmin,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => _signIn(context, DemoSessions.tenantAdmin()),
                ),
                const SizedBox(height: 12),
                AppButton(
                  label: l10n.demoSignInSuperAdmin,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => _signIn(context, DemoSessions.superAdmin()),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
