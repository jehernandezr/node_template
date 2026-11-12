import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Outlined surface that groups related content.
///
/// When [onTap] is set the whole card is tappable with an ink effect.
class AppCard extends StatelessWidget {
  /// Creates a card around [child].
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.onTap,
  });

  /// Content of the card.
  final Widget child;

  /// Space between the card edge and [child].
  final EdgeInsetsGeometry padding;

  /// Called when the card is tapped. Null makes the card static.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg),
    );
    final content = Padding(padding: padding, child: child);
    return Card.outlined(
      margin: EdgeInsets.zero,
      shape: shape,
      child: onTap == null
          ? content
          : InkWell(customBorder: shape, onTap: onTap, child: content),
    );
  }
}
