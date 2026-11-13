import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'login_page.dart';

/// Asks a signed-in user for a recent second factor, then returns to [from].
///
/// The router sends here the sessions that only fail an `AccessRule.mfa`
/// rule, and `WebShell.requestStepUp` pushes it (with [returnsResult]) when a
/// microfrontend asks for a second factor before a sensitive action. DEMO: the
/// button marks the factor as verified without a challenge; the real page runs
/// the MFA flow of the `auth` package and adopts the new tokens.
class StepUpPage extends StatelessWidget {
  const StepUpPage({
    super.key,
    required this.session,
    this.from,
    this.clock = DateTime.now,
    this.returnsResult = false,
  });

  /// `extra` of a push that expects a result: the page pops with true after
  /// verifying and with false when the user goes back.
  static const Object request = _StepUpRequest();

  /// Whether the page was pushed by `requestStepUp` and pops with the result
  /// instead of going to [from].
  final bool returnsResult;

  /// Session updated with the verification time.
  final ValueNotifier<UserSession> session;

  /// Location to return to, from the `from` query parameter.
  final String? from;

  /// Time recorded as the verification time.
  final DateTime Function() clock;

  void _verify(BuildContext context) {
    final verified = session.value.withMfaVerifiedAt(clock());
    if (returnsResult) {
      // Pop before the session changes: the router refreshes on that change
      // and would otherwise rebuild the stack with this page still on it.
      context.pop(true);
      session.value = verified;
    } else {
      session.value = verified;
      context.go(LoginPage.safeDestination(from));
    }
  }

  void _back(BuildContext context) {
    if (returnsResult) {
      context.pop(false);
    } else {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppPage(
      title: l10n.stepUpTitle,
      onBack: () => _back(context),
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

final class _StepUpRequest {
  const _StepUpRequest();
}
