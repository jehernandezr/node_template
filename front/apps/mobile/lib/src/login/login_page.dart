import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../demo_sessions.dart';

/// Demo sign-in. Signing in writes the session and returns to [from].
///
/// This is not real authentication: it only picks one of the demo profiles.
class LoginPage extends StatelessWidget {
  /// Creates the login page for [session]. [from] is the location to return to.
  const LoginPage({super.key, required this.session, this.from});

  /// Session written on sign-in.
  final ValueNotifier<UserSession> session;

  /// Location the user was heading to, from the `from` query parameter.
  final String? from;

  void _signIn(BuildContext context, UserSession demo) {
    session.value = demo;
    GoRouter.of(context).go(safeReturnLocation(from));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      l10n.demoModeTitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(l10n.demoModeHint, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  FilledButton(
                    key: const ValueKey('demo-sign-in-client'),
                    onPressed: () => _signIn(context, demoClientSession),
                    child: Text(l10n.demoSignInCustomer),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    key: const ValueKey('demo-sign-in-client-no-assistant'),
                    onPressed: () =>
                        _signIn(context, demoClientNoAssistantSession),
                    child: Text(l10n.demoSignInCustomerNoAssistant),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Returns [from] when it is an in-app absolute path, otherwise `/`.
///
/// Rejects external or protocol-relative targets such as `//host` or `https://`.
String safeReturnLocation(String? from) {
  if (from == null || !from.startsWith('/') || from.startsWith('//')) {
    return '/';
  }
  if (from.contains('\\')) return '/';
  return from;
}
