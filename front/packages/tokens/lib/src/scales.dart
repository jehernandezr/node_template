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

  /// 999px, fully rounded shapes such as pills and avatars.
  static const double full = 999;
}

/// Icon sizes in logical pixels.
///
/// Mirrors `icon-size` in `design-tokens.json`.
abstract final class AppIconSize {
  /// 16px, icons inline with text.
  static const double sm = 16;

  /// 24px, default icon size.
  static const double md = 24;

  /// 48px, illustrative icons of empty and error states.
  static const double xl = 48;
}

/// Content widths in logical pixels.
///
/// Mirrors `layout` in `design-tokens.json`.
abstract final class AppLayout {
  /// 360px, the list pane of a two-pane layout.
  static const double listPaneWidth = 360;

  /// 720px, the widest column for reading text and forms.
  static const double readingWidth = 720;

  /// 1100px, the widest column for dense content such as tables.
  static const double wideContentWidth = 1100;
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
