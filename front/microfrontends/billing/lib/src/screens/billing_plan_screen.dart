import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../data/billing_repository.dart';
import '../l10n/billing_labels.dart';
import '../l10n/generated/billing_localizations.dart';
import '../shared/constants/billing_access.dart';
import '../shared/constants/billing_paths.dart';
import '../shared/types/billing_types.dart';
import '../shared/utils/billing_tones.dart';
import 'billing_plan_controller.dart';
import 'widgets/change_plan_sheet.dart';
import 'widgets/status_chip.dart';
import 'widgets/usage_meter.dart';

/// `/billing`: current plan, subscription status and usage of each quota.
class BillingPlanScreen extends StatelessWidget {
  /// Creates the screen backed by [repository].
  const BillingPlanScreen({super.key, required this.repository});

  /// Source of the subscription and usage.
  final BillingRepository repository;

  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<BillingPlanController>(
        create: (_) => BillingPlanController(repository)..start(),
        builder: (context, controller) {
          final l10n = BillingLocalizations.of(context);
          return AppPage(
            title: l10n.billingPageTitle,
            body: AsyncValueView<PlanOverview>(
              value: controller.overview,
              errorMessage: l10n.loadError,
              onRetry: controller.start,
              data: (overview) => _PlanContent(
                overview: overview,
                onChangePlan: () => _openChangePlan(
                  context,
                  repository: repository,
                  controller: controller,
                  currentPlanId: overview.subscription.plan.id,
                ),
              ),
            ),
          );
        },
      );

  /// Opens the sheet over the screen. The plan reloads only when the change
  /// was saved.
  static Future<void> _openChangePlan(
    BuildContext context, {
    required BillingRepository repository,
    required BillingPlanController controller,
    required String currentPlanId,
  }) async {
    final changed = await context.showLocalizedSheet<bool>(
      isScrollControlled: true,
      builder: (_) =>
          ChangePlanSheet(repository: repository, currentPlanId: currentPlanId),
    );
    if (!context.mounted) return;
    if (changed == true) unawaited(controller.start());
  }
}

class _PlanContent extends StatelessWidget {
  const _PlanContent({required this.overview, required this.onChangePlan});

  final PlanOverview overview;
  final VoidCallback onChangePlan;

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final theme = Theme.of(context);
    final subscription = overview.subscription;
    final plan = subscription.plan;
    final period = subscription.period;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.currentPlan, style: theme.textTheme.labelLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(plan.name, style: theme.textTheme.headlineSmall),
              const SizedBox(height: AppSpacing.xs),
              Text(
                l10n.planPrice(
                  formatMoney(plan.price, locale: context.localeTag),
                  periodicityLabel(l10n, plan.periodicity),
                ),
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.subscriptionStatus,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  StatusChip(
                    label: subscriptionStatusLabel(l10n, subscription.status),
                    tone: BillingTones.subscription(subscription.status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                l10n.currentPeriodLine(
                  formatPeriod(l10n, period, locale: context.localeTag),
                ),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(l10n.usageTitle, style: theme.textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          child: overview.usage.isEmpty
              ? Text(l10n.noQuotas)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final usage in overview.usage) ...[
                      UsageMeter(usage: usage),
                      const SizedBox(height: AppSpacing.md),
                    ],
                  ],
                ),
        ),
        const SizedBox(height: AppSpacing.lg),
        AccessGate(
          rule: billingWriteRule,
          child: Padding(
            padding: const EdgeInsetsDirectional.only(bottom: AppSpacing.sm),
            child: AppButton(label: l10n.changePlan, onPressed: onChangePlan),
          ),
        ),
        AppButton(
          label: l10n.viewInvoices,
          variant: AppButtonVariant.secondary,
          onPressed: () => context.go(BillingPaths.invoices),
        ),
      ],
    );
  }
}
