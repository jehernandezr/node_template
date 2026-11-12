import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  group('Breakpoint.fromWidth', () {
    test('compact below 600', () {
      expect(Breakpoint.fromWidth(0), Breakpoint.compact);
      expect(Breakpoint.fromWidth(599.9), Breakpoint.compact);
    });

    test('medium from 600 up to 1024', () {
      expect(Breakpoint.fromWidth(600), Breakpoint.medium);
      expect(Breakpoint.fromWidth(1023.9), Breakpoint.medium);
    });

    test('expanded from 1024', () {
      expect(Breakpoint.fromWidth(1024), Breakpoint.expanded);
      expect(Breakpoint.fromWidth(2000), Breakpoint.expanded);
    });
  });

  testWidgets('Breakpoint.of reads the surrounding MediaQuery', (tester) async {
    setSurface(tester, 800);
    late Breakpoint found;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            found = Breakpoint.of(context);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(found, Breakpoint.medium);
  });

  testWidgets('Breakpoint.of follows a resized surface', (tester) async {
    setSurface(tester, 400);
    late Breakpoint found;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            found = Breakpoint.of(context);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(found, Breakpoint.compact);

    tester.view.physicalSize = const Size(1280, 800);
    await tester.pumpAndSettle();
    expect(found, Breakpoint.expanded);
  });
}
