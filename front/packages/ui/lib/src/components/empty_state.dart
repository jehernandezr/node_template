import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

import 'app_button.dart';

/// Placeholder shown when a list or screen has no content yet.
///
/// The optional action is shown only when both [actionLabel] and [onAction]
/// are set.
class EmptyState extends StatelessWidget {
  /// Creates an empty state.
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  /// Icon shown above the title.
  final IconData icon;

  /// Short headline.
  final String title;

  /// Optional explanation under the title.
  final String? message;

  /// Label of the optional action button.
  final String? actionLabel;

  /// Called when the action button is tapped.
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final detail = message;
    final action = actionLabel;
    final onTap = onAction;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: scheme.onSurfaceVariant),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (detail != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                detail,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null && onTap != null) ...[
              const SizedBox(height: AppSpacing.md),
              AppButton(label: action, onPressed: onTap),
            ],
          ],
        ),
      ),
    );
  }
}
