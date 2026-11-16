import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Success, warning and info color roles, as a theme extension.
@immutable
final class StatusColors extends ThemeExtension<StatusColors> {
  /// Creates the roles. Every one is required so a set cannot be partial.
  const StatusColors({
    required this.success,
    required this.onSuccess,
    required this.successContainer,
    required this.onSuccessContainer,
    required this.warning,
    required this.onWarning,
    required this.warningContainer,
    required this.onWarningContainer,
    required this.info,
    required this.onInfo,
    required this.infoContainer,
    required this.onInfoContainer,
  });

  // Blending the base color at this strength over the raised surface keeps the
  // container tinted but leaves the text on it above the contrast minimum.
  static const double _containerAlpha = 0.16;

  /// Builds the roles from [palette]. Containers are the base color blended
  /// over the raised surface, so they stay readable in dark mode.
  factory StatusColors.fromPalette(ColorPalette palette) => StatusColors(
    success: palette.successBase,
    onSuccess: palette.successOn,
    successContainer: _container(palette.successBase, palette),
    onSuccessContainer: palette.textPrimary,
    warning: palette.warningBase,
    onWarning: palette.warningOn,
    warningContainer: _container(palette.warningBase, palette),
    onWarningContainer: palette.textPrimary,
    info: palette.infoBase,
    onInfo: palette.infoOn,
    infoContainer: _container(palette.infoBase, palette),
    onInfoContainer: palette.textPrimary,
  );

  /// Strong success color, for icons and fills.
  final Color success;

  /// Content drawn on [success].
  final Color onSuccess;

  /// Soft success background.
  final Color successContainer;

  /// Content drawn on [successContainer].
  final Color onSuccessContainer;

  /// Strong warning color, for icons and fills.
  final Color warning;

  /// Content drawn on [warning].
  final Color onWarning;

  /// Soft warning background.
  final Color warningContainer;

  /// Content drawn on [warningContainer].
  final Color onWarningContainer;

  /// Strong informational color, for icons and fills.
  final Color info;

  /// Content drawn on [info].
  final Color onInfo;

  /// Soft informational background.
  final Color infoContainer;

  /// Content drawn on [infoContainer].
  final Color onInfoContainer;

  static Color _container(Color base, ColorPalette palette) => Color.alphaBlend(
    base.withValues(alpha: _containerAlpha),
    palette.surfaceRaised,
  );

  @override
  StatusColors copyWith({
    Color? success,
    Color? onSuccess,
    Color? successContainer,
    Color? onSuccessContainer,
    Color? warning,
    Color? onWarning,
    Color? warningContainer,
    Color? onWarningContainer,
    Color? info,
    Color? onInfo,
    Color? infoContainer,
    Color? onInfoContainer,
  }) => StatusColors(
    success: success ?? this.success,
    onSuccess: onSuccess ?? this.onSuccess,
    successContainer: successContainer ?? this.successContainer,
    onSuccessContainer: onSuccessContainer ?? this.onSuccessContainer,
    warning: warning ?? this.warning,
    onWarning: onWarning ?? this.onWarning,
    warningContainer: warningContainer ?? this.warningContainer,
    onWarningContainer: onWarningContainer ?? this.onWarningContainer,
    info: info ?? this.info,
    onInfo: onInfo ?? this.onInfo,
    infoContainer: infoContainer ?? this.infoContainer,
    onInfoContainer: onInfoContainer ?? this.onInfoContainer,
  );

  @override
  StatusColors lerp(StatusColors? other, double t) {
    if (other == null) return this;
    return StatusColors(
      success: Color.lerp(success, other.success, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      successContainer: Color.lerp(
        successContainer,
        other.successContainer,
        t,
      )!,
      onSuccessContainer: Color.lerp(
        onSuccessContainer,
        other.onSuccessContainer,
        t,
      )!,
      warning: Color.lerp(warning, other.warning, t)!,
      onWarning: Color.lerp(onWarning, other.onWarning, t)!,
      warningContainer: Color.lerp(
        warningContainer,
        other.warningContainer,
        t,
      )!,
      onWarningContainer: Color.lerp(
        onWarningContainer,
        other.onWarningContainer,
        t,
      )!,
      info: Color.lerp(info, other.info, t)!,
      onInfo: Color.lerp(onInfo, other.onInfo, t)!,
      infoContainer: Color.lerp(infoContainer, other.infoContainer, t)!,
      onInfoContainer: Color.lerp(onInfoContainer, other.onInfoContainer, t)!,
    );
  }
}

/// Access to the [StatusColors] of the current theme.
extension StatusColorsContext on BuildContext {
  /// The status roles of the current theme.
  StatusColors get statusColors => Theme.of(this).extension<StatusColors>()!;
}
