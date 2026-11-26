import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatInteger;

import '../../l10n/billing_labels.dart';
import '../../l10n/generated/billing_localizations.dart';
import '../../shared/enums/billing_enums.dart';
import '../../shared/types/billing_types.dart';

/// Progress of one quota: label, `used / limit` and a bar that turns
/// warning from 80% and danger from 100%.
///
/// Thick enough to read the fill at a glance, thin enough to stay secondary to the numbers above it.
class UsageMeter extends StatelessWidget {
  /// Creates a meter for [usage].
  const UsageMeter({super.key, required this.usage});

  /// Usage to display.
  final QuotaUsage usage;

  static const double _barHeight = 8;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = BillingLocalizations.of(context);
    final locale = context.localeTag;
    final level = usage.level;
    final color = switch (level) {
      UsageLevel.normal => scheme.primary,
      UsageLevel.warning => context.statusColors.warning,
      UsageLevel.danger => scheme.error,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                quotaLabel(l10n, usage.quota.key),
                style: theme.textTheme.bodyMedium,
              ),
            ),
            Text(
              l10n.usageAmounts(
                formatInteger(usage.used, locale: locale),
                formatInteger(usage.quota.limit, locale: locale),
              ),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: level == UsageLevel.normal ? null : FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.full),
          child: LinearProgressIndicator(
            value: usage.ratio.clamp(0, 1).toDouble(),
            minHeight: _barHeight,
            color: color,
            backgroundColor: scheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }
}
