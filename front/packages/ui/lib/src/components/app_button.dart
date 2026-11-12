import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Visual role of an [AppButton].
enum AppButtonVariant {
  /// Main action of a screen.
  primary,

  /// Secondary action with an outline.
  secondary,

  /// Destructive action such as delete or revoke.
  danger,
}

/// Button with a [variant] and a [loading] state.
///
/// While [loading] is true the button shows a spinner and cannot be tapped.
class AppButton extends StatelessWidget {
  /// Creates a button. A null [onPressed] disables it.
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
  });

  /// Text shown on the button.
  final String label;

  /// Called when the button is tapped. Null disables the button.
  final VoidCallback? onPressed;

  /// Visual role of the button.
  final AppButtonVariant variant;

  /// Shows a spinner in place of the label content and disables the button.
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final foreground = switch (variant) {
      AppButtonVariant.primary => scheme.onPrimary,
      AppButtonVariant.secondary => scheme.primary,
      AppButtonVariant.danger => scheme.onError,
    };
    final onTap = loading ? null : onPressed;
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (loading) ...[
          SizedBox.square(
            dimension: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: foreground),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
        Text(label),
      ],
    );

    return switch (variant) {
      AppButtonVariant.primary => FilledButton(
        onPressed: onTap,
        child: content,
      ),
      AppButtonVariant.secondary => OutlinedButton(
        onPressed: onTap,
        child: content,
      ),
      AppButtonVariant.danger => FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.error,
          foregroundColor: scheme.onError,
        ),
        onPressed: onTap,
        child: content,
      ),
    };
  }
}
