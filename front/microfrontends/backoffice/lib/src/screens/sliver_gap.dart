import 'package:material_ui/material_ui.dart';

/// Vertical space between slivers.
class SliverGap extends StatelessWidget {
  /// Vertical gap of [height] inside a sliver list.
  const SliverGap(this.height, {super.key});

  /// Height of the gap.
  final double height;

  @override
  Widget build(BuildContext context) =>
      SliverToBoxAdapter(child: SizedBox(height: height));
}
