import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Small rounded label with a tinted background in [color].
class StatusChip extends StatelessWidget {
  /// Creates a chip showing [label] in [color].
  const StatusChip({super.key, required this.label, required this.color});

  /// Text shown in the chip.
  final String label;

  /// Foreground color; the background is a light tint of it.
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium
              ?.copyWith(color: color, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
