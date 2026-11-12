import 'package:flutter/painting.dart';

/// Semantic color roles for one brightness.
///
/// Each field mirrors a `color.<mode>.<group>.<role>` entry in
/// `design-tokens.json`.
class ColorPalette {
  /// Creates a palette. Every role is required so a palette cannot be partial.
  const ColorPalette({
    required this.brandPrimary,
    required this.brandOnPrimary,
    required this.surfaceBase,
    required this.surfaceRaised,
    required this.surfaceOutline,
    required this.textPrimary,
    required this.textSecondary,
    required this.successBase,
    required this.successOn,
    required this.warningBase,
    required this.warningOn,
    required this.dangerBase,
    required this.dangerOn,
  });

  /// Main brand color for primary actions and key highlights.
  final Color brandPrimary;

  /// Content color drawn on top of [brandPrimary].
  final Color brandOnPrimary;

  /// Page background.
  final Color surfaceBase;

  /// Elevated surfaces such as cards and sheets.
  final Color surfaceRaised;

  /// Borders and dividers.
  final Color surfaceOutline;

  /// Main body and heading text.
  final Color textPrimary;

  /// Supporting text, hints and captions.
  final Color textSecondary;

  /// Success status color.
  final Color successBase;

  /// Content color drawn on top of [successBase].
  final Color successOn;

  /// Warning status color.
  final Color warningBase;

  /// Content color drawn on top of [warningBase].
  final Color warningOn;

  /// Error and destructive action color.
  final Color dangerBase;

  /// Content color drawn on top of [dangerBase].
  final Color dangerOn;
}

/// Light and dark palettes, matching `design-tokens.json`.
abstract final class AppColors {
  /// Palette for light backgrounds.
  static const ColorPalette light = ColorPalette(
    brandPrimary: Color(0xFF2563EB),
    brandOnPrimary: Color(0xFFFFFFFF),
    surfaceBase: Color(0xFFF8FAFC),
    surfaceRaised: Color(0xFFFFFFFF),
    surfaceOutline: Color(0xFFCBD5E1),
    textPrimary: Color(0xFF0F172A),
    textSecondary: Color(0xFF475569),
    successBase: Color(0xFF15803D),
    successOn: Color(0xFFFFFFFF),
    warningBase: Color(0xFFB45309),
    warningOn: Color(0xFFFFFFFF),
    dangerBase: Color(0xFFB91C1C),
    dangerOn: Color(0xFFFFFFFF),
  );

  /// Palette for dark backgrounds.
  static const ColorPalette dark = ColorPalette(
    brandPrimary: Color(0xFF60A5FA),
    brandOnPrimary: Color(0xFF0B1220),
    surfaceBase: Color(0xFF0B1220),
    surfaceRaised: Color(0xFF111C2E),
    surfaceOutline: Color(0xFF334155),
    textPrimary: Color(0xFFF1F5F9),
    textSecondary: Color(0xFF94A3B8),
    successBase: Color(0xFF4ADE80),
    successOn: Color(0xFF052E16),
    warningBase: Color(0xFFFBBF24),
    warningOn: Color(0xFF422006),
    dangerBase: Color(0xFFF87171),
    dangerOn: Color(0xFF450A0A),
  );
}
