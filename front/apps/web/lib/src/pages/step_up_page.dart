import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'login_page.dart';

/// Asks a signed-in user for a recent second factor, then returns to [from].
///
/// The router sends here the sessions that only fail an `AccessRule.mfa`
/// rule. DEMO: the button marks the factor as verified without a challenge;
/// the real page runs the MFA flow of the `auth` package.
class StepUpPage extends StatelessWidget {
  const StepUpPage({
    super.key,
    required this.session,
    this.from,
    this.clock = DateTime.now,
  });

  /// Session updated with the verification time.
  final ValueNotifier<UserSession> session;

  /// Location to return to, from the `from` query parameter.
  final String? from;

  /// Time recorded as the verification time.
  final DateTime Function() clock;

  void _verify(BuildContext context) {
    session.value = session.value.withMfaVerifiedAt(clock());
    context.go(LoginPage.safeDestination(from));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppPage(
      title: l10n.stepUpTitle,
      onBack: () => context.go('/'),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.verified_user_outlined, size: 48),
                const SizedBox(height: AppSpacing.md),
                Text(l10n.stepUpMessage, textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: l10n.stepUpDemoVerify,
                  onPressed: () => _verify(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
