import 'package:auth/auth.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'login_page.dart';
import 'step_up_form.dart';

/// Asks a signed-in user for a recent second factor, then returns to [from].
///
/// The router sends here the sessions that only fail an `AccessRule.mfa`
/// rule, and the shell pushes it (with [onResult]) when a microfrontend asks
/// for a second factor before a sensitive action.
///
/// With a [connection] the page runs the step-up of identity
/// ([StepUpForm]): the session adopts the new access token and the shell
/// session gets the `mfaVerifiedAt` the server answered. Without one (demo
/// mode) a button marks the factor as verified with [clock].
class StepUpPage extends StatelessWidget {
  /// Creates the page for [session]. [from] is the location to return to.
  const StepUpPage({
    super.key,
    required this.session,
    this.from,
    this.clock = DateTime.now,
    this.onResult,
    this.connection,
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

  /// Time recorded as the verification time in demo mode.
  final DateTime Function() clock;

  /// Real identity connection, or null in demo mode.
  final IdentityConnection? connection;

  void _verified(BuildContext context, DateTime at) {
    final router = GoRouter.of(context);
    final onResult = this.onResult;
    if (onResult != null) {
      onResult(true);
      // Pop before the session changes: the router refreshes on that change
      // and would otherwise rebuild the stack with this page still on it.
      router.pop(true);
      _publish(at);
    } else {
      _publish(at);
      router.go(safeReturnLocation(from));
    }
  }

  /// With a connection the shell session follows its access; in demo mode
  /// the page writes the session itself.
  void _publish(DateTime at) {
    final connection = this.connection;
    if (connection != null) {
      connection.markMfaVerified(at);
    } else {
      session.value = session.value.withMfaVerifiedAt(at);
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
    final connection = this.connection;
    return AppPage(
      title: l10n.stepUpTitle,
      onBack: () => _back(context),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.verified_user_outlined, size: 48),
                const SizedBox(height: AppSpacing.md),
                Text(l10n.stepUpMessage, textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.lg),
                if (connection != null)
                  StepUpForm(
                    connection: connection,
                    onVerified: (at) => _verified(context, at),
                  )
                else
                  FilledButton(
                    key: const ValueKey('step-up-verify'),
                    onPressed: () => _verified(context, clock()),
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
