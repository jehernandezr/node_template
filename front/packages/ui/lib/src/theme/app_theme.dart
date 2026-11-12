import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Material 3 themes built from the design tokens in `package:tokens`.
abstract final class AppTheme {
  /// Light theme built from [AppColors.light].
  static ThemeData light() => _build(AppColors.light, Brightness.light);

  /// Dark theme built from [AppColors.dark].
  static ThemeData dark() => _build(AppColors.dark, Brightness.dark);

  static ThemeData _build(ColorPalette palette, Brightness brightness) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: palette.brandPrimary,
      onPrimary: palette.brandOnPrimary,
      secondary: palette.textSecondary,
      onSecondary: palette.surfaceBase,
      error: palette.dangerBase,
      onError: palette.dangerOn,
      surface: palette.surfaceBase,
      onSurface: palette.textPrimary,
      surfaceContainer: palette.surfaceRaised,
      outline: palette.surfaceOutline,
    );
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
    );
    final text = base.textTheme;
    return base.copyWith(
      textTheme: text.copyWith(
        labelSmall: text.labelSmall?.copyWith(fontSize: AppTypeScale.caption),
        bodyMedium: text.bodyMedium?.copyWith(fontSize: AppTypeScale.body),
        titleLarge: text.titleLarge?.copyWith(fontSize: AppTypeScale.title),
        headlineMedium: text.headlineMedium?.copyWith(
          fontSize: AppTypeScale.headline,
        ),
      ),
    );
  }
}
