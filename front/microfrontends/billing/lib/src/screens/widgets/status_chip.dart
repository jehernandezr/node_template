import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../shared/enums/billing_enums.dart';

/// Small rounded label whose colors follow the [StatusTone] it shows.
class StatusChip extends StatelessWidget {
  /// Creates a chip showing [label] with the colors of [tone].
  const StatusChip({super.key, required this.label, required this.tone});

  /// Text shown in the chip.
  final String label;

  /// Meaning of the status. Picks the container colors of the theme.
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = _ChipColors.of(context, tone);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium
              ?.copyWith(color: colors.foreground, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Background and text colors of a chip. Both come from the theme so that
/// light and dark modes keep the contrast.
final class _ChipColors {
  const _ChipColors._(this.background, this.foreground);

  factory _ChipColors.of(BuildContext context, StatusTone tone) {
    final scheme = Theme.of(context).colorScheme;
    final statusColors = context.statusColors;
    return switch (tone) {
      StatusTone.success => _ChipColors._(
        statusColors.successContainer,
        statusColors.onSuccessContainer,
      ),
      StatusTone.warning => _ChipColors._(
        statusColors.warningContainer,
        statusColors.onWarningContainer,
      ),
      StatusTone.info => _ChipColors._(
        statusColors.infoContainer,
        statusColors.onInfoContainer,
      ),
      StatusTone.danger => _ChipColors._(
        scheme.errorContainer,
        scheme.onErrorContainer,
      ),
      StatusTone.neutral => _ChipColors._(
        scheme.surfaceContainerHighest,
        scheme.onSurfaceVariant,
      ),
    };
  }

  /// Fill behind the label.
  final Color background;

  /// Color of the label.
  final Color foreground;
}
