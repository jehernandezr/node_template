import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'login_page.dart';

/// Asks a signed-in user for a recent second factor, then returns to [from].
///
/// The router sends here the sessions that only fail an `AccessRule.mfa`
/// rule, and the shell pushes it (with [onResult]) when a microfrontend asks
/// for a second factor before a sensitive action. DEMO: the button marks the
/// factor as verified without a challenge, also with a real session, because
/// the identity contract has no step-up route yet; the real page will run that
/// flow and adopt the new tokens.
class StepUpPage extends StatelessWidget {
  /// Creates the page for [session]. [from] is the location to return to.
  const StepUpPage({
    super.key,
    required this.session,
    this.from,
    this.clock = DateTime.now,
    this.onResult,
  });

  /// Answer of the shell's `requestStepUp`, or null when the router
  /// redirected here.
  ///
  /// With it the page reports the result and pops, so the screen that asked
  /// stays mounted. It reports before popping: see `StepUpRequests`.
  final ValueChanged<bool>? onResult;

  /// Session updated with the verification time.
  final ValueNotifier<UserSession> session;

  /// Location the user was heading to, from the `from` query parameter.
  final String? from;

  /// Time recorded as the verification time.
  final DateTime Function() clock;

  void _verify(BuildContext context) {
    final verified = session.value.withMfaVerifiedAt(clock());
    final router = GoRouter.of(context);
    final onResult = this.onResult;
    if (onResult != null) {
      onResult(true);
      // Pop before the session changes: the router refreshes on that change
      // and would otherwise rebuild the stack with this page still on it.
      router.pop(true);
      session.value = verified;
    } else {
      session.value = verified;
      router.go(safeReturnLocation(from));
    }
  }

  void _back(BuildContext context) {
    final router = GoRouter.of(context);
    final onResult = this.onResult;
    if (onResult != null) {
      onResult(false);
      router.pop(false);
    } else {
      router.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppPage(
      title: l10n.stepUpTitle,
      onBack: () => _back(context),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.verified_user_outlined, size: 48),
                const SizedBox(height: AppSpacing.md),
                Text(l10n.stepUpMessage, textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.lg),
                FilledButton(
                  key: const ValueKey('step-up-verify'),
                  onPressed: () => _verify(context),
                  child: Text(l10n.stepUpDemoVerify),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
