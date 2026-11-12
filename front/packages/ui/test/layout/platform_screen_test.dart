import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  PlatformScreen screen() => PlatformScreen(
    compact: (_) => const Text('compact'),
    medium: (_) => const Text('medium'),
    expanded: (_) => const Text('expanded'),
  );

  testWidgets('picks the compact builder on phones', (tester) async {
    setSurface(tester, 400);
    await pumpApp(tester, screen());
    expect(find.text('compact'), findsOneWidget);
  });

  testWidgets('picks the medium builder at 800', (tester) async {
    setSurface(tester, 800);
    await pumpApp(tester, screen());
    expect(find.text('medium'), findsOneWidget);
  });

  testWidgets('picks the expanded builder at 1200', (tester) async {
    setSurface(tester, 1200);
    await pumpApp(tester, screen());
    expect(find.text('expanded'), findsOneWidget);
  });

  testWidgets('falls back to medium, then compact, when builders are missing', (
    tester,
  ) async {
    setSurface(tester, 1200);
    await pumpApp(
      tester,
      PlatformScreen(
        compact: (_) => const Text('compact'),
        medium: (_) => const Text('medium'),
      ),
    );
    expect(find.text('medium'), findsOneWidget);

    tester.view.physicalSize = const Size(800, 800);
    await tester.pumpAndSettle();
    expect(find.text('medium'), findsOneWidget);

    await pumpApp(tester, PlatformScreen(compact: (_) => const Text('only')));
    tester.view.physicalSize = const Size(1200, 800);
    await tester.pumpAndSettle();
    expect(find.text('only'), findsOneWidget);
  });
}
