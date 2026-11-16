import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

void main() {
  group(MetaLine, () {
    testWidgets('joins the parts with the Spanish separator', (tester) async {
      await pumpApp(tester, const MetaLine(parts: ['Android', 'hoy']));
      expect(find.text('Android · hoy'), findsOneWidget);
    });

    testWidgets('joins the parts with the English separator', (tester) async {
      await pumpApp(
        tester,
        const MetaLine(parts: ['Android', 'today']),
        locale: const Locale('en'),
      );
      expect(find.text('Android · today'), findsOneWidget);
    });

    testWidgets('shows a single part without a separator', (tester) async {
      await pumpApp(tester, const MetaLine(parts: ['Solo']));
      expect(find.text('Solo'), findsOneWidget);
    });

    testWidgets('takes no space without parts', (tester) async {
      await pumpApp(tester, const MetaLine(parts: []));
      expect(
        find.descendant(of: find.byType(MetaLine), matching: find.byType(Text)),
        findsNothing,
      );
    });

    testWidgets('applies the given style', (tester) async {
      await pumpApp(
        tester,
        const MetaLine(parts: ['Android'], style: TextStyle(fontSize: 30)),
      );
      final text = tester.widget<Text>(
        find.descendant(of: find.byType(MetaLine), matching: find.byType(Text)),
      );
      expect(text.style?.fontSize, 30);
    });
  });
}
