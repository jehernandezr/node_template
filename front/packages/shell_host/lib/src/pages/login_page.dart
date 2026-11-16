import 'package:auth/auth.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../demo_profiles.dart';
import '../return_location.dart';
import 'sign_in_form.dart';

/// Sign-in page. Signing in opens the session and returns to [from].
///
/// With a [connection] it is the real sign-in against identity. Without one
/// it is the demo sign-in, which only picks one of [demoProfiles].
class LoginPage extends StatelessWidget {
  const LoginPage({
    super.key,
    required this.session,
    required this.demoProfiles,
    this.from,
    this.connection,
  });

  /// Session written by the demo sign-in.
  final ValueNotifier<UserSession> session;

  /// Profiles offered in demo mode, in order.
  final List<DemoProfile> demoProfiles;

  /// Location the user was heading to, from the `from` query parameter.
  final String? from;

  /// Real identity connection, or null in demo mode.
  final IdentityConnection? connection;

  void _returnToDestination(BuildContext context) =>
      GoRouter.of(context).go(safeReturnLocation(from));

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final connection = this.connection;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
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
                  if (connection != null) ...[
                    const SizedBox(height: AppSpacing.lg),
                    SignInForm(
                      connection: connection,
                      onSignedIn: () => _returnToDestination(context),
                    ),
                  ] else ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      l10n.demoModeTitle,
                      style: theme.textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      l10n.demoModeHint,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    for (final (index, profile) in demoProfiles.indexed) ...[
                      if (index > 0) const SizedBox(height: AppSpacing.sm),
                      AppButton(
                        key: ValueKey('demo-sign-in-${profile.name}'),
                        label: profile.label(l10n),
                        variant: index == 0
                            ? AppButtonVariant.primary
                            : AppButtonVariant.secondary,
                        onPressed: () {
                          session.value = profile.session();
                          _returnToDestination(context);
                        },
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
