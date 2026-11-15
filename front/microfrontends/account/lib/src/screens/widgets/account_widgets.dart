import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../shared/constants/account_constants.dart';

/// Row inside an [AppCard]: title, optional detail, badge and action.
class AccountRowCard extends StatelessWidget {
  const AccountRowCard({
    super.key,
    required this.title,
    this.subtitle,
    this.details = const [],
    this.badge,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String? subtitle;

  /// Secondary pieces joined with the localized separator in one line, shown
  /// under [subtitle].
  final List<String> details;
  final Widget? badge;
  final Widget? trailing;
  final VoidCallback? onTap;

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
          // A trailing action next to the text only fits on wide cards; on
          // narrow ones it goes below so neither gets squeezed.
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
  const StatusBadge({super.key, required this.label});

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
