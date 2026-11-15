import 'package:material_ui/material_ui.dart';

/// Vertical space between slivers.
class SliverGap extends StatelessWidget {
  const SliverGap(this.height, {super.key});

  final double height;

  @override
  Widget build(BuildContext context) =>
      SliverToBoxAdapter(child: SizedBox(height: height));
}
