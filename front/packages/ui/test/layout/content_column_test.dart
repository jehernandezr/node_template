import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

void main() {
  group(ContentColumn, () {
    const child = SizedBox(
      key: Key('child'),
      width: double.infinity,
      height: 10,
    );

    testWidgets('limits the width to the reading width on a wide surface', (
      tester,
    ) async {
      setSurface(tester, 1600);
      await pumpApp(tester, const ContentColumn(child: child));
      expect(
        tester.getSize(find.byKey(const Key('child'))).width,
        AppLayout.readingWidth,
      );
    });

    testWidgets('takes the full width on a compact surface', (tester) async {
      setSurface(tester, 400);
      await pumpApp(tester, const ContentColumn(child: child));
      expect(tester.getSize(find.byKey(const Key('child'))).width, 400);
    });

    testWidgets('honors a custom maxWidth', (tester) async {
      setSurface(tester, 1600);
      await pumpApp(tester, const ContentColumn(maxWidth: 300, child: child));
      expect(tester.getSize(find.byKey(const Key('child'))).width, 300);
    });

    testWidgets('centers the constrained content', (tester) async {
      setSurface(tester, 1600);
      await pumpApp(tester, const ContentColumn(child: child));
      expect(tester.getCenter(find.byKey(const Key('child'))).dx, 800);
    });
  });
}
