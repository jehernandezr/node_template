import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

/// Pumps [child] inside a themed app with a [Scaffold] body.
Future<void> pumpApp(WidgetTester tester, Widget child) {
  return tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      home: Scaffold(body: child),
    ),
  );
}

/// Sets the test surface to [width] x [height] logical pixels at 1x and
/// restores it after the test.
void setSurface(WidgetTester tester, double width, {double height = 800}) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, height);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}
