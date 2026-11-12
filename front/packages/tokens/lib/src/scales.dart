/// Spacing scale in logical pixels, with a 4px base.
///
/// Mirrors `spacing` in `design-tokens.json`.
abstract final class AppSpacing {
  /// 4px, hairline gaps between tightly coupled elements.
  static const double xs = 4;

  /// 8px, gaps inside a component.
  static const double sm = 8;

  /// 16px, default padding and gaps between elements.
  static const double md = 16;

  /// 24px, padding between sections.
  static const double lg = 24;

  /// 32px, large separation between page regions.
  static const double xl = 32;
}

/// Corner radius scale in logical pixels.
///
/// Mirrors `radius` in `design-tokens.json`.
abstract final class AppRadius {
  /// 4px, small controls such as chips and tags.
  static const double sm = 4;

  /// 8px, buttons and inputs.
  static const double md = 8;

  /// 16px, cards and sheets.
  static const double lg = 16;
}

/// Font sizes in logical pixels.
///
/// Mirrors `typography.size` in `design-tokens.json`.
abstract final class AppTypeScale {
  /// 12px, captions and metadata.
  static const double caption = 12;

  /// 14px, body text.
  static const double body = 14;

  /// 20px, section titles.
  static const double title = 20;

  /// 28px, page headlines.
  static const double headline = 28;
}
