import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

/// Pumps [child] inside a themed app with a [Scaffold] body and the shared
/// texts in [locale] (Spanish by default).
Future<void> pumpApp(
  WidgetTester tester,
  Widget child, {
  Locale locale = const Locale('es'),
}) {
  return tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
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
