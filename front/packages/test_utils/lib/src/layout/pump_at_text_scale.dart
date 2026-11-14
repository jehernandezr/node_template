import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Sets the text scale (2.0 for the accessibility check) for the test. The
/// reset runs at teardown, so the scale never leaks into the next test. The
/// [home] brings its own app (a `MaterialApp` or `TestApp().wrap`).
Future<void> pumpAtTextScale(
  WidgetTester tester,
  Widget home, {
  double scale = 2.0,
}) async {
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(home);
  await tester.pump();
}
