import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDate;

import '../data/account_repository.dart';
import '../l10n/account_labels.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/constants/account_access.dart';
import '../shared/constants/account_constants.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import '../shared/utils/account_paths.dart';
import 'security_controller.dart';
import 'step_up_gate.dart';

/// MFA, passkeys and recovery codes. Every change asks for a recent second
/// factor first.
class SecurityScreen extends StatelessWidget {
  const SecurityScreen({
    super.key,
    required this.repository,
    required this.requestStepUp,
  });

  final AccountRepository repository;

  /// The shell's step-up, for the actions that change the second factor.
  final Future<bool> Function() requestStepUp;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SecurityController>(
    create: (context) => SecurityController(
      repository,
      stepUp: StepUpGate.fromContext(
        context,
        rule: accountStepUpRule,
        request: requestStepUp,
      ),
    )..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).securityTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: AsyncValueView<SecurityOverview>(
        value: controller.overview,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (overview) => ContentColumn(
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              _MfaCard(mfa: overview.mfa),
              const SizedBox(height: AppSpacing.md),
              _PasskeysCard(
                passkeys: overview.passkeys,
                onAdd: () => _addPasskey(context, controller),
              ),
              const SizedBox(height: AppSpacing.md),
              _RecoveryCard(
                onRegenerate: () => _regenerate(context, controller),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Future<void> _addPasskey(
    BuildContext context,
    SecurityController controller,
  ) async {
    final result = await controller.addPasskey();
    if (!context.mounted) return;
    final l10n = AccountLocalizations.of(context);
    showActionResult(
      context,
      result,
      success: l10n.passkeyAdded,
      failure: l10n.actionFailed,
    );
  }

  Future<void> _regenerate(
    BuildContext context,
    SecurityController controller,
  ) async {
    final result = await controller.regenerateCodes();
    if (!context.mounted) return;
    final l10n = AccountLocalizations.of(context);
    showActionResult(
      context,
      result,
      success: l10n.recoveryRegenerated,
      failure: l10n.actionFailed,
    );
    // The codes are shown once, so they open a dialog the user must read.
    if (result is ActionSucceeded<List<String>>) {
      await context.showLocalizedDialog<void>(
        builder: (dialogContext) => _RecoveryCodesDialog(codes: result.value),
      );
    }
  }
}

class _MfaCard extends StatelessWidget {
  const _MfaCard({required this.mfa});

  final MfaStatus mfa;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AccountLocalizations.of(context);
    final method = mfa.method;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.mfaTitle, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Text(
            mfa.enabled
                ? l10n.mfaEnabled(
                    method == null ? '' : mfaFactorLabel(l10n, method),
                  )
                : l10n.mfaDisabled,
          ),
        ],
      ),
    );
  }
}

class _PasskeysCard extends StatelessWidget {
  const _PasskeysCard({required this.passkeys, required this.onAdd});

  final List<Passkey> passkeys;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AccountLocalizations.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              Text(l10n.passkeysTitle, style: theme.textTheme.titleMedium),
              AppButton(
                label: l10n.passkeyAdd,
                variant: AppButtonVariant.secondary,
                onPressed: onAdd,
              ),
            ],
          ),
          if (passkeys.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Text(l10n.passkeysEmpty),
            ),
          for (final passkey in passkeys)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(passkey.name),
              subtitle: Text(
                l10n.createdOnLabel(
                  formatDate(passkey.createdAt, locale: context.localeTag),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RecoveryCard extends StatelessWidget {
  const _RecoveryCard({required this.onRegenerate});

  final VoidCallback onRegenerate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AccountLocalizations.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.recoveryTitle, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Text(l10n.recoveryDescription),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: l10n.recoveryRegenerate,
            variant: AppButtonVariant.secondary,
            onPressed: onRegenerate,
          ),
        ],
      ),
    );
  }
}

class _RecoveryCodesDialog extends StatelessWidget {
  const _RecoveryCodesDialog({required this.codes});

  final List<String> codes;

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    return AlertDialog(
      title: Text(l10n.recoveryCodesTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.recoveryCodesNotice),
          const SizedBox(height: AppSpacing.sm),
          for (final code in codes)
            SelectableText(
              code,
              style: const TextStyle(fontFamily: accountCodeFontFamily),
            ),
        ],
      ),
      actions: [
        AppButton(
          label: AppLocalizations.of(context).close,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}
