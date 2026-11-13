import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../../l10n/billing_labels.dart';
import '../../shared/types/billing_types.dart';
import '../../data/billing_repository.dart';
import '../../l10n/generated/billing_localizations.dart';

/// Bottom sheet that lists plans and switches the subscription.
///
/// Pops with `true` after a change is confirmed, otherwise with nothing.
class ChangePlanSheet extends StatefulWidget {
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
  State<ChangePlanSheet> createState() => _ChangePlanSheetState();
}

class _ChangePlanSheetState extends State<ChangePlanSheet> {
  AsyncValue<List<Plan>> _plans = const AsyncValue.loading();
  String? _selectedId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadPlans();
  }

  Future<void> _loadPlans() async {
    final result = await AsyncValue.guard(widget.repository.availablePlans);
    if (!mounted) return;
    setState(() => _plans = result);
  }

  void _reloadPlans() {
    setState(() => _plans = const AsyncValue.loading());
    _loadPlans();
  }

  Future<void> _confirm() async {
    final planId = _selectedId;
    if (planId == null) return;
    final l10n = BillingLocalizations.of(context);
    setState(() => _saving = true);
    try {
      await widget.repository.changePlan(planId);
    } on Exception catch (error) {
      // API, contract or network: the sheet must not stay saving.
      if (!mounted) return;
      setState(() => _saving = false);
      showActionError(context, error, message: l10n.changePlanError);
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final appL10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.md,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        child: AsyncValueView<List<Plan>>(
          value: _plans,
          errorMessage: l10n.loadError,
          codeLabel: appL10n.errorCodeLabel,
          traceIdLabel: appL10n.errorTraceIdLabel,
          retryLabel: appL10n.actionRetry,
          onRetry: _reloadPlans,
          loading: const SizedBox(height: 160, child: LoadingView()),
          data: (plans) {
            final selected = _selectedId;
            final showProration =
                selected != null && selected != widget.currentPlanId;
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
                    selected: plan.id == selected,
                    title: Text(plan.name),
                    subtitle: Text(
                      '${formatMoney(plan.price, locale: localeTag(context))} / '
                      '${periodicityLabel(l10n, plan.periodicity)}',
                    ),
                    trailing: plan.id == widget.currentPlanId
                        ? Text(l10n.currentPlanBadge)
                        : plan.id == selected
                        ? Icon(
                            Icons.check_circle,
                            color: theme.colorScheme.primary,
                          )
                        : null,
                    onTap: plan.id == widget.currentPlanId || _saving
                        ? null
                        : () => setState(() => _selectedId = plan.id),
                  ),
                if (showProration) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Text(
                      l10n.prorationNote,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                AppButton(
                  label: l10n.confirmChange,
                  onPressed: showProration ? _confirm : null,
                  loading: _saving,
                ),
                const SizedBox(height: AppSpacing.sm),
                AppButton(
                  label: appL10n.actionCancel,
                  variant: AppButtonVariant.secondary,
                  onPressed: _saving ? null : () => Navigator.of(context).pop(),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
