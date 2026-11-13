import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../shared/enums/billing_enums.dart';
import '../shared/types/billing_types.dart';
import '../shared/utils/money_format.dart';
import 'billing_colors.dart';

/// Progress of one quota: label, `used / limit` and a bar that turns
/// warning from 80% and danger from 100%.
class UsageMeter extends StatelessWidget {
  /// Creates a meter for [usage].
  const UsageMeter({super.key, required this.usage});

  /// Usage to display.
  final QuotaUsage usage;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final level = usage.level;
    final color = switch (level) {
      UsageLevel.normal => scheme.primary,
      UsageLevel.warning => billingWarningColor,
      UsageLevel.danger => scheme.error,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                usage.quota.label,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            Text(
              '${formatCount(usage.used)} / ${formatCount(usage.quota.limit)}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: level == UsageLevel.normal ? null : color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: usage.ratio.clamp(0, 1).toDouble(),
            minHeight: 8,
            color: color,
            backgroundColor: scheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }
}
