import 'package:flutter/widgets.dart';

import 'breakpoint.dart';

/// Picks a builder for the current [Breakpoint], so a screen can have a
/// dedicated layout per width class.
///
/// Falls back to the next smaller layout when a builder is missing:
/// expanded uses medium, then compact; medium uses compact.
class PlatformScreen extends StatelessWidget {
  /// Creates a screen. [compact] is required; the others are optional.
  const PlatformScreen({
    super.key,
    required this.compact,
    this.medium,
    this.expanded,
  });

  /// Layout for widths under 600 logical pixels.
  final WidgetBuilder compact;

  /// Layout for widths from 600 up to 1024 logical pixels.
  final WidgetBuilder? medium;

  /// Layout for widths of 1024 logical pixels and wider.
  final WidgetBuilder? expanded;

  @override
  Widget build(BuildContext context) {
    final builder = switch (Breakpoint.of(context)) {
      Breakpoint.compact => compact,
      Breakpoint.medium => medium ?? compact,
      Breakpoint.expanded => expanded ?? medium ?? compact,
    };
    return builder(context);
  }
}
