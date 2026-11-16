import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'billing_test_app.dart';

/// Checks the text contrast of a widget in the light and the dark theme.
abstract final class ContrastCheck {
  /// Pumps [child] centered on a scaffold with each theme and runs
  /// `textContrastGuideline`. The `finally` releases the semantics handle
  /// even when the guideline fails, so the next test starts with it off.
  static Future<void> expectBothThemes(
    WidgetTester tester,
    Widget child,
  ) async {
    for (final theme in [AppTheme.light(), AppTheme.dark()]) {
      // A new key per theme builds a fresh tree: reusing the old one would
      // animate the text style and measure a frame halfway between themes.
      await const BillingTestApp().pump(
        tester,
        Theme(
          key: ValueKey(theme.brightness),
          data: theme,
          child: Scaffold(body: Center(child: child)),
        ),
      );
      final handle = tester.ensureSemantics();
      try {
        await expectLater(tester, meetsGuideline(textContrastGuideline));
      } finally {
        handle.dispose();
      }
    }
  }
}
