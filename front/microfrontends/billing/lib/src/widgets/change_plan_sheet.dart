import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../billing_labels.dart';
import '../data/billing_models.dart';
import '../data/billing_repository.dart';
import '../format/money_format.dart';
import '../l10n/generated/billing_localizations.dart';

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
  late final Future<List<Plan>> _plans = widget.repository.availablePlans();
  String? _selectedId;
  bool _saving = false;
  Object? _error;

  Future<void> _confirm() async {
    final planId = _selectedId;
    if (planId == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.repository.changePlan(planId);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = error;
      });
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
        child: FutureBuilder<List<Plan>>(
          future: _plans,
          builder: (context, snapshot) {
            final plans = snapshot.data;
            if (plans == null) {
              return const SizedBox(height: 160, child: LoadingView());
            }
            final selected = _selectedId;
            final showProration =
                selected != null && selected != widget.currentPlanId;
            final error = _error;
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
                      '${formatMoney(plan.price)} / '
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
                if (error != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    l10n.changePlanError,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.error,
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
