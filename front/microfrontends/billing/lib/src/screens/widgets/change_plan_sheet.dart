import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../../data/billing_repository.dart';
import '../../l10n/billing_labels.dart';
import '../../l10n/generated/billing_localizations.dart';
import '../../shared/constants/billing_constants.dart';
import '../../shared/types/billing_types.dart';
import '../change_plan_controller.dart';
import '../change_plan_state.dart';

/// Bottom sheet that lists plans and switches the subscription.
///
/// Pops with `true` after a change is confirmed, otherwise with nothing.
class ChangePlanSheet extends StatelessWidget {
  /// Creates the sheet for the subscription on [currentPlanId].
  const ChangePlanSheet({
    super.key,
    required this.repository,
    required this.currentPlanId,
  });

  /// Source of plans and the place where the change is saved.
  final BillingRepository repository;

  /// Plan the tenant is on now; it cannot be selected.
  final String currentPlanId;

  @override
  Widget build(BuildContext context) => ControllerBuilder<ChangePlanController>(
    create: (_) =>
        ChangePlanController(repository, currentPlanId: currentPlanId)..start(),
    builder: (context, controller) {
      final l10n = BillingLocalizations.of(context);
      return SafeArea(
        child: Padding(
          padding: const EdgeInsetsDirectional.only(
            start: AppSpacing.md,
            top: AppSpacing.md,
            end: AppSpacing.md,
            bottom: AppSpacing.lg,
          ),
          child: switch (controller.state) {
            ChangePlanLoading() => ConstrainedBox(
              constraints: BoxConstraints(minHeight: billingSheetMinHeight),
              child: const LoadingView(),
            ),
            ChangePlanFailed(plans: [], :final error) =>
              ErrorView.fromException(
                error,
                fallbackMessage: l10n.loadError,
                onRetry: controller.start,
              ),
            ChangePlanChoosing(:final plans, :final selectedId) => _PlanList(
              plans: plans,
              selectedId: selectedId,
              saving: false,
              currentPlanId: currentPlanId,
              controller: controller,
            ),
            ChangePlanSaving(:final plans, :final selectedId) => _PlanList(
              plans: plans,
              selectedId: selectedId,
              saving: true,
              currentPlanId: currentPlanId,
              controller: controller,
            ),
            ChangePlanFailed(:final plans, :final selectedId) => _PlanList(
              plans: plans,
              selectedId: selectedId,
              saving: false,
              currentPlanId: currentPlanId,
              controller: controller,
            ),
            ChangePlanDone() => const SizedBox.shrink(),
          },
        ),
      );
    },
  );

  /// Saves the selection and closes the sheet with `true` when it worked.
  static Future<void> _confirm(
    BuildContext context,
    ChangePlanController controller,
  ) async {
    final failure = BillingLocalizations.of(context).changePlanError;
    final result = await controller.confirm();
    if (!context.mounted) return;
    if (result is ActionSucceeded<Subscription>) {
      Navigator.of(context).pop(true);
      return;
    }
    showActionResult(
      context,
      result,
      failure: controller.isPlanRefused ? null : failure,
    );
  }
}

/// The plans, the proration note and the two buttons.
class _PlanList extends StatelessWidget {
  const _PlanList({
    required this.plans,
    required this.selectedId,
    required this.saving,
    required this.currentPlanId,
    required this.controller,
  });

  final List<Plan> plans;
  final String? selectedId;
  final bool saving;
  final String currentPlanId;
  final ChangePlanController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final appL10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final showProration = selectedId != null && selectedId != currentPlanId;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.changePlanTitle, style: theme.textTheme.titleLarge),
        const SizedBox(height: AppSpacing.sm),
        Text(l10n.availablePlans, style: theme.textTheme.labelLarge),
        for (final plan in plans)
          ListTile(
            contentPadding: EdgeInsets.zero,
            selected: plan.id == selectedId,
            title: Text(plan.name),
            subtitle: Text(
              l10n.planPrice(
                formatMoney(plan.price, locale: context.localeTag),
                periodicityLabel(l10n, plan.periodicity),
              ),
            ),
            trailing: plan.id == currentPlanId
                ? Text(l10n.currentPlanBadge)
                : plan.id == selectedId
                ? Icon(Icons.check_circle, color: theme.colorScheme.primary)
                : null,
            onTap: plan.id == currentPlanId || saving
                ? null
                : () => controller.select(plan.id),
          ),
        if (showProration) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(l10n.prorationNote, style: theme.textTheme.bodySmall),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        AppButton(
          label: l10n.confirmChange,
          onPressed: controller.canConfirm
              ? () => ChangePlanSheet._confirm(context, controller)
              : null,
          loading: saving,
        ),
        const SizedBox(height: AppSpacing.sm),
        AppButton(
          label: appL10n.actionCancel,
          variant: AppButtonVariant.secondary,
          onPressed: saving ? null : () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}
