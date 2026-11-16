import 'package:flutter/services.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/verifier_repository.dart';
import '../l10n/generated/verifier_localizations.dart';
import 'verifier_controller.dart';
import 'verifier_state.dart';
import 'verifier_widgets.dart';

/// Device verifier: shows the code for a login attempt from a new device.
class VerifierScreen extends StatelessWidget {
  /// Creates the screen on top of [repository]. The key follows the
  /// repository, so a new identity gets a new controller.
  const VerifierScreen({super.key, required this.repository});

  /// Source of challenges and codes.
  final VerifierRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<VerifierController>(
    key: ObjectKey(repository),
    create: (context) =>
        VerifierController(repository, clock: _clockOf(context))..start(),
    builder: (context, controller) => AppPage(
      title: VerifierLocalizations.of(context).title,
      body: VerifierAnnouncer(
        state: controller.state,
        child: _VerifierBody(controller: controller),
      ),
    ),
  );

  static Clock _clockOf(BuildContext context) {
    final scope = ShellAccessScope.maybeRead(context);
    if (scope == null) {
      throw StateError('VerifierScreen needs a ShellAccessScope above it');
    }
    return scope.clock;
  }
}

/// Draws one [VerifierState].
class _VerifierBody extends StatelessWidget {
  const _VerifierBody({required this.controller});

  final VerifierController controller;

  @override
  Widget build(BuildContext context) => switch (controller.state) {
    VerifierLoading() => const LoadingView(),
    VerifierFailed(:final error) => ErrorView.fromException(
      error,
      fallbackMessage: VerifierLocalizations.of(context).loadError,
      onRetry: controller.start,
    ),
    VerifierWaiting() => const _ReadyList(blocked: false),
    VerifierBlocked() => const _ReadyList(blocked: true),
    final VerifierChallenge challenge => _ChallengeView(
      controller: controller,
      shown: challenge,
      denying: false,
    ),
    VerifierDenying(:final previous) => _ChallengeView(
      controller: controller,
      shown: previous,
      denying: true,
    ),
  };
}

/// No challenge pending, with the blocked notice after a deny.
class _ReadyList extends StatelessWidget {
  const _ReadyList({required this.blocked});

  final bool blocked;

  @override
  Widget build(BuildContext context) {
    final l10n = VerifierLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        if (blocked) ...[
          const VerifierBlockedNotice(),
          const SizedBox(height: AppSpacing.md),
        ],
        EmptyState(
          icon: Icons.verified_user_outlined,
          title: l10n.readyTitle,
          message: l10n.readyMessage,
        ),
      ],
    );
  }
}

/// The pending challenge: code, countdown, context and the deny action.
class _ChallengeView extends StatelessWidget {
  const _ChallengeView({
    required this.controller,
    required this.shown,
    required this.denying,
  });

  final VerifierController controller;
  final VerifierChallenge shown;
  final bool denying;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(AppSpacing.md),
    children: [
      VerifierCodeCard(
        code: shown.code,
        copied: shown.copied,
        onCopy: () => _copy(context),
      ),
      const SizedBox(height: AppSpacing.md),
      VerifierCountdown(
        secondsLeft: shown.secondsLeft,
        totalSeconds: shown.challenge.validFor.inSeconds,
      ),
      const SizedBox(height: AppSpacing.md),
      VerifierContextCard(attempt: shown.challenge.context),
      const SizedBox(height: AppSpacing.md),
      AppButton(
        label: VerifierLocalizations.of(context).denyButton,
        variant: AppButtonVariant.danger,
        loading: denying,
        onPressed: () => _confirmDeny(context),
      ),
    ],
  );

  Future<void> _copy(BuildContext context) async {
    if (shown.code case AsyncData<String>(:final value)) {
      await Clipboard.setData(ClipboardData(text: value));
      if (!context.mounted) return;
      controller.markCopied();
    }
  }

  Future<void> _confirmDeny(BuildContext context) async {
    final confirmed = await context.showLocalizedDialog<bool>(
      builder: (dialogContext) {
        final l10n = VerifierLocalizations.of(dialogContext);
        return AlertDialog(
          title: Text(l10n.denyDialogTitle),
          content: Text(l10n.denyDialogBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(AppLocalizations.of(dialogContext).actionCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(l10n.denyConfirm),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !context.mounted) return;
    final result = await controller.deny();
    if (!context.mounted) return;
    showActionResult(
      context,
      result,
      failure: VerifierLocalizations.of(context).denyFailed,
    );
  }
}
