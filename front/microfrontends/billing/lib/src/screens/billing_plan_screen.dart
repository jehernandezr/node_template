import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../shared/constants/billing_access.dart';
import '../l10n/billing_labels.dart';
import '../shared/types/billing_types.dart';
import '../data/billing_repository.dart';
import '../l10n/generated/billing_localizations.dart';
import 'widgets/billing_colors.dart';
import 'widgets/change_plan_sheet.dart';
import 'widgets/status_chip.dart';
import 'widgets/usage_meter.dart';

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
  AsyncValue<_PlanData> _state = const AsyncValue.loading();
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<_PlanData> _fetch() async {
    final subscription = await widget.repository.currentSubscription();
    final usage = await widget.repository.currentUsage();
    return _PlanData(subscription: subscription, usage: usage);
  }

  Future<void> _load() async {
    final generation = ++_generation;
    final result = await AsyncValue.guard(_fetch);
    if (!mounted || generation != _generation) return;
    setState(() => _state = result);
  }

  void _reload() {
    setState(() => _state = const AsyncValue.loading());
    _load();
  }

  Future<void> _openChangePlan(String currentPlanId) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ChangePlanSheet(
        repository: widget.repository,
        currentPlanId: currentPlanId,
      ),
    );
    if (!mounted) return;
    if (changed == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final appL10n = AppLocalizations.of(context);
    return AppPage(
      title: l10n.billingPageTitle,
      body: AsyncValueView<_PlanData>(
        value: _state,
        errorMessage: l10n.loadError,
        codeLabel: appL10n.errorCodeLabel,
        traceIdLabel: appL10n.errorTraceIdLabel,
        retryLabel: appL10n.actionRetry,
        onRetry: _reload,
        data: (data) => _PlanContent(
          data: data,
          onChangePlan: () => _openChangePlan(data.subscription.plan.id),
        ),
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
                '${formatMoney(plan.price, locale: localeTag(context))} / '
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
                '${l10n.currentPeriod}: ${formatPeriod(l10n, period, locale: localeTag(context))}',
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
        AccessGate(
          rule: billingAccessRule,
          child: Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: AppButton(label: l10n.changePlan, onPressed: onChangePlan),
          ),
        ),
        AppButton(
          label: l10n.viewInvoices,
          variant: AppButtonVariant.secondary,
          onPressed: () => context.go('/billing/invoices'),
        ),
      ],
    );
  }
}
