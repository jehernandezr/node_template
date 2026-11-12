import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../billing_labels.dart';
import '../data/billing_models.dart';
import '../data/billing_repository.dart';
import '../format/money_format.dart';
import '../format/period_format.dart';
import '../l10n/generated/billing_localizations.dart';
import '../widgets/billing_colors.dart';
import '../widgets/change_plan_sheet.dart';
import '../widgets/status_chip.dart';
import '../widgets/usage_meter.dart';

/// `/billing`: current plan, subscription status and usage of each quota.
class BillingPlanScreen extends StatefulWidget {
  /// Creates the screen backed by [repository].
  const BillingPlanScreen({super.key, required this.repository});

  /// Source of the subscription and usage.
  final BillingRepository repository;

  @override
  State<BillingPlanScreen> createState() => _BillingPlanScreenState();
}

class _PlanData {
  const _PlanData({required this.subscription, required this.usage});

  final Subscription subscription;
  final List<QuotaUsage> usage;
}

class _BillingPlanScreenState extends State<BillingPlanScreen> {
  late Future<_PlanData> _future = _load();

  Future<_PlanData> _load() async {
    final subscription = await widget.repository.currentSubscription();
    final usage = await widget.repository.currentUsage();
    return _PlanData(subscription: subscription, usage: usage);
  }

  void _reload() => setState(() => _future = _load());

  Future<void> _openChangePlan(String currentPlanId) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ChangePlanSheet(
        repository: widget.repository,
        currentPlanId: currentPlanId,
      ),
    );
    if (changed == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.billingPageTitle)),
      body: FutureBuilder<_PlanData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ErrorView.fromException(
              snapshot.error!,
              fallbackMessage: l10n.loadError,
              codeLabel: AppLocalizations.of(context).errorCodeLabel,
              traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
              retryLabel: AppLocalizations.of(context).actionRetry,
              onRetry: _reload,
            );
          }
          final data = snapshot.data;
          if (data == null) return const LoadingView();
          return _PlanContent(
            data: data,
            onChangePlan: () => _openChangePlan(data.subscription.plan.id),
          );
        },
      ),
    );
  }
}

class _PlanContent extends StatelessWidget {
  const _PlanContent({required this.data, required this.onChangePlan});

  final _PlanData data;
  final VoidCallback onChangePlan;

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final theme = Theme.of(context);
    final subscription = data.subscription;
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
                '${formatMoney(plan.price)} / '
                '${periodicityLabel(l10n, plan.periodicity)}',
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
                    color: subscriptionStatusColor(subscription.status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${l10n.currentPeriod}: ${formatPeriod(l10n, period)}',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(l10n.usageTitle, style: theme.textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          child: data.usage.isEmpty
              ? Text(l10n.noQuotas)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final usage in data.usage) ...[
                      UsageMeter(usage: usage),
                      const SizedBox(height: AppSpacing.md),
                    ],
                  ],
                ),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppButton(label: l10n.changePlan, onPressed: onChangePlan),
        const SizedBox(height: AppSpacing.sm),
        AppButton(
          label: l10n.viewInvoices,
          variant: AppButtonVariant.secondary,
          onPressed: () => context.go('/billing/invoices'),
        ),
      ],
    );
  }
}
