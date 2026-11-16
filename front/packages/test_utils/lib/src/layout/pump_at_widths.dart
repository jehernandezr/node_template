import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pumps [home] at each width and calls [check] with it. [home] brings its
/// own app (a `MaterialApp` or `TestApp().wrap`), so the width reaches the
/// layout of the screen under test and not a bare widget tree.
Future<void> pumpAtWidths(
  WidgetTester tester,
  Widget home, {
  List<double> widths = const [320, 800, 1280],
  Future<void> Function(double width)? check,
}) async {
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  for (final width in widths) {
    tester.view.physicalSize = Size(width, 800);
    await tester.pumpWidget(home);
    await tester.pump();
    if (check != null) await check(width);
  }
}
