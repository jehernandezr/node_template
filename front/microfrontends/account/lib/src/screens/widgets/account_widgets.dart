import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../shared/constants/account_constants.dart';

/// Row inside an [AppCard]: title, optional detail, badge and action.
class AccountRowCard extends StatelessWidget {
  /// Row of the account with [title], an optional [subtitle], badge and trailing widget.
  const AccountRowCard({
    super.key,
    required this.title,
    this.subtitle,
    this.details = const [],
    this.badge,
    this.trailing,
    this.onTap,
  });

  /// Main text of the row.
  final String title;

  /// Secondary text, if any.
  final String? subtitle;

  /// Secondary pieces joined with the localized separator in one line, shown
  /// under [subtitle].
  final List<String> details;

  /// Badge after the title, if any.
  final Widget? badge;

  /// Widget at the end of the row, if any.
  final Widget? trailing;

  /// Called when the row is tapped, if it is tappable.
  final VoidCallback? onTap;

  /// A trailing action next to the text only fits on wide cards; on narrow ones it goes below so neither gets squeezed.
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final detail = subtitle;
    final badgeWidget = badge;
    final trailingWidget = trailing;
    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(title, style: theme.textTheme.titleMedium),
            ?badgeWidget,
          ],
        ),
        if (detail != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(detail, style: muted),
        ],
        if (details.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xs),
          MetaLine(parts: details, style: muted),
        ],
      ],
    );
    return AppCard(
      onTap: onTap,
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (trailingWidget == null) return text;
          if (constraints.maxWidth < accountCompactRowWidth) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                text,
                const SizedBox(height: AppSpacing.sm),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: trailingWidget,
                ),
              ],
            );
          }
          return Row(
            children: [
              Expanded(child: text),
              const SizedBox(width: AppSpacing.md),
              trailingWidget,
            ],
          );
        },
      ),
    );
  }
}

/// Small text badge, such as the current session or the verifier device.
class StatusBadge extends StatelessWidget {
  /// Small badge with [label].
  const StatusBadge({super.key, required this.label});

  /// Text of the badge.
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Chip(
      label: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: scheme.onSecondaryContainer,
        ),
      ),
      backgroundColor: scheme.secondaryContainer,
      side: BorderSide.none,
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
    );
  }
}
