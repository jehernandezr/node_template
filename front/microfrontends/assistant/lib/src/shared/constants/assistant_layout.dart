import 'package:ui/ui.dart';

/// Measures of the chat that the design tokens do not name.
abstract final class AssistantLayout {
  /// Widest an assistant message grows.
  static const double bubbleMaxWidth = 640;

  /// Space under each message.
  static const double messageGap = AppSpacing.sm + AppSpacing.xs;

  /// Padding of the user's message.
  static const double userBubbleHorizontal = AppSpacing.md;

  /// Padding of the user's message, top and bottom.
  static const double userBubbleVertical = AppSpacing.sm;

  /// Distance from the end of the list under which the user counts as being
  /// at the end of it.
  static const double followTolerance = 48;
}
