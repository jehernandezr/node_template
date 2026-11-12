import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

void main() {
  test('light theme is built from the light palette', () {
    final theme = AppTheme.light();
    expect(theme.useMaterial3, isTrue);
    expect(theme.colorScheme.brightness, Brightness.light);
    expect(theme.colorScheme.primary, AppColors.light.brandPrimary);
    expect(theme.colorScheme.error, AppColors.light.dangerBase);
    expect(theme.colorScheme.surface, AppColors.light.surfaceBase);
  });

  test('dark theme is built from the dark palette', () {
    final theme = AppTheme.dark();
    expect(theme.colorScheme.brightness, Brightness.dark);
    expect(theme.colorScheme.primary, AppColors.dark.brandPrimary);
    expect(theme.colorScheme.onSurface, AppColors.dark.textPrimary);
  });

  test('text styles use the type scale', () {
    final text = AppTheme.light().textTheme;
    expect(text.labelSmall?.fontSize, AppTypeScale.caption);
    expect(text.bodyMedium?.fontSize, AppTypeScale.body);
    expect(text.titleLarge?.fontSize, AppTypeScale.title);
    expect(text.headlineMedium?.fontSize, AppTypeScale.headline);
  });
}
