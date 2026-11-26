import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDate;

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import '../shared/utils/account_paths.dart';
import 'agreements_controller.dart';
import 'widgets/account_widgets.dart';

/// Agreements still to accept, and the history of the accepted ones.
class AgreementsScreen extends StatelessWidget {
  /// Agreements screen backed by [repository].
  const AgreementsScreen({super.key, required this.repository});

  /// Source of the agreements.
  final AccountRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<AgreementsController>(
    create: (context) => AgreementsController(repository)..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).agreementsTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: AsyncValueView<AgreementsOverview>(
        value: controller.agreements,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (overview) => _AgreementsList(
          overview: overview,
          onReview: (agreement) => _review(context, controller, agreement),
        ),
      ),
    ),
  );

  Future<void> _review(
    BuildContext context,
    AgreementsController controller,
    Agreement agreement,
  ) async {
    final accepted = await context.showLocalizedDialog<bool>(
      builder: (dialogContext) => _ReviewDialog(agreement: agreement),
    );
    if (accepted != true || !context.mounted) return;
    final result = await controller.accept(agreement.id);
    if (!context.mounted) return;
    final l10n = AccountLocalizations.of(context);
    showActionResult(
      context,
      result,
      success: l10n.agreementAccepted,
      failure: l10n.actionFailed,
    );
  }
}

class _AgreementsList extends StatelessWidget {
  const _AgreementsList({required this.overview, required this.onReview});

  final AgreementsOverview overview;
  final ValueChanged<Agreement> onReview;

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    final theme = Theme.of(context);
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(l10n.pendingSection, style: theme.textTheme.titleMedium),
          if (overview.pending.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: EmptyState(
                icon: Icons.check_circle_outline,
                title: l10n.pendingEmptyTitle,
              ),
            ),
          for (final agreement in overview.pending)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: AccountRowCard(
                title: agreement.title,
                details: [
                  l10n.versionLabel(agreement.version),
                  agreement.required ? l10n.requiredLabel : l10n.optionalLabel,
                  if (agreement.graceUntil case final grace?)
                    l10n.deadlineLabel(
                      formatDate(grace, locale: context.localeTag),
                    ),
                ],
                trailing: AppButton(
                  label: l10n.reviewAndAccept,
                  onPressed: () => onReview(agreement),
                ),
              ),
            ),
          const SizedBox(height: AppSpacing.md),
          Text(l10n.acceptedSection, style: theme.textTheme.titleMedium),
          if (overview.accepted.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Text(l10n.acceptedEmptyMessage),
            ),
          for (final agreement in overview.accepted)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: AccountRowCard(
                title: agreement.title,
                details: [
                  l10n.versionLabel(agreement.version),
                  if (agreement.acceptedAt case final at?)
                    l10n.acceptedOnLabel(
                      formatDate(at, locale: context.localeTag),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ReviewDialog extends StatelessWidget {
  const _ReviewDialog({required this.agreement});

  final Agreement agreement;

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(agreement.title),
    content: Text(
      AccountLocalizations.of(context).reviewDialogMessage(agreement.version),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(false),
        child: Text(AppLocalizations.of(context).actionCancel),
      ),
      AppButton(
        label: AccountLocalizations.of(context).accept,
        onPressed: () => Navigator.of(context).pop(true),
      ),
    ],
  );
}
