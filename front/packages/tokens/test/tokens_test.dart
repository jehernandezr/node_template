import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:tokens/tokens.dart';

/// Loads `design-tokens.json`; `flutter test` runs with the package root as cwd.
final Map<String, dynamic> _json = jsonDecode(
  File('design-tokens.json').readAsStringSync(),
) as Map<String, dynamic>;

/// Returns the `$value` found at a dot-separated [path] in the JSON.
dynamic _value(String path) {
  dynamic node = _json;
  for (final key in path.split('.')) {
    node = node[key];
  }
  return node[r'$value'];
}

/// Converts a `#RRGGBB` token into an ARGB int with full opacity.
int _argb(String hex) => 0xFF000000 | int.parse(hex.substring(1), radix: 16);

void main() {
  group('colors match design-tokens.json', () {
    final roles = <String, int Function(ColorPalette)>{
      'brand.primary': (p) => p.brandPrimary.toARGB32(),
      'brand.on-primary': (p) => p.brandOnPrimary.toARGB32(),
      'surface.base': (p) => p.surfaceBase.toARGB32(),
      'surface.raised': (p) => p.surfaceRaised.toARGB32(),
      'surface.outline': (p) => p.surfaceOutline.toARGB32(),
      'text.primary': (p) => p.textPrimary.toARGB32(),
      'text.secondary': (p) => p.textSecondary.toARGB32(),
      'success.base': (p) => p.successBase.toARGB32(),
      'success.on': (p) => p.successOn.toARGB32(),
      'warning.base': (p) => p.warningBase.toARGB32(),
      'warning.on': (p) => p.warningOn.toARGB32(),
      'danger.base': (p) => p.dangerBase.toARGB32(),
      'danger.on': (p) => p.dangerOn.toARGB32(),
    };

    for (final mode in ['light', 'dark']) {
      final palette = mode == 'light' ? AppColors.light : AppColors.dark;
      test('$mode palette', () {
        for (final entry in roles.entries) {
          final expected = _argb(_value('color.$mode.${entry.key}') as String);
          expect(
            entry.value(palette),
            expected,
            reason: 'color.$mode.${entry.key}',
          );
        }
      });
    }
  });

  test('spacing matches design-tokens.json', () {
    final values = <String, double>{
      'xs': AppSpacing.xs,
      'sm': AppSpacing.sm,
      'md': AppSpacing.md,
      'lg': AppSpacing.lg,
      'xl': AppSpacing.xl,
    };
    for (final entry in values.entries) {
      expect(
        entry.value,
        (_value('spacing.${entry.key}') as num).toDouble(),
        reason: 'spacing.${entry.key}',
      );
    }
  });

  test('radius matches design-tokens.json', () {
    final values = <String, double>{
      'sm': AppRadius.sm,
      'md': AppRadius.md,
      'lg': AppRadius.lg,
    };
    for (final entry in values.entries) {
      expect(
        entry.value,
        (_value('radius.${entry.key}') as num).toDouble(),
        reason: 'radius.${entry.key}',
      );
    }
  });

  test('typography sizes match design-tokens.json', () {
    final values = <String, double>{
      'caption': AppTypeScale.caption,
      'body': AppTypeScale.body,
      'title': AppTypeScale.title,
      'headline': AppTypeScale.headline,
    };
    for (final entry in values.entries) {
      expect(
        entry.value,
        (_value('typography.size.${entry.key}') as num).toDouble(),
        reason: 'typography.size.${entry.key}',
      );
    }
  });
}
