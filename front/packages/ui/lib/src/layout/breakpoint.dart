import 'package:flutter/widgets.dart';

/// Width class of the available window, used to choose a layout.
enum Breakpoint {
  /// Under 600 logical pixels: phones.
  compact,

  /// From 600 up to 1024 logical pixels: tablets and narrow windows.
  medium,

  /// 1024 logical pixels and wider: desktop and large web windows.
  expanded;

  static const double _mediumMinWidth = 600;
  static const double _expandedMinWidth = 1024;

  /// Breakpoint for a logical [width].
  static Breakpoint fromWidth(double width) {
    if (width < _mediumMinWidth) return Breakpoint.compact;
    if (width < _expandedMinWidth) return Breakpoint.medium;
    return Breakpoint.expanded;
  }

  /// Breakpoint for the width of the surrounding [MediaQuery].
  static Breakpoint of(BuildContext context) =>
      fromWidth(MediaQuery.sizeOf(context).width);
}
