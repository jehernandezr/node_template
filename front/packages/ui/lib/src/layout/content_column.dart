import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Centers [child] and limits its width to [maxWidth], so a form or a list
/// does not stretch across a wide window.
class ContentColumn extends StatelessWidget {
  /// Creates the column. [maxWidth] defaults to [AppLayout.readingWidth].
  const ContentColumn({
    super.key,
    required this.child,
    this.maxWidth = AppLayout.readingWidth,
  });

  /// Content to constrain.
  final Widget child;

  /// Widest the content may be, in logical pixels.
  final double maxWidth;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    ),
  );
}
