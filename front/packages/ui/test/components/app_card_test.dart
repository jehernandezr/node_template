import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  testWidgets('renders its child inside an outlined Card', (tester) async {
    await pumpApp(tester, const AppCard(child: Text('Content')));
    expect(find.text('Content'), findsOneWidget);
    expect(find.byType(Card), findsOneWidget);
    expect(find.byType(InkWell), findsNothing);
  });

  testWidgets('is tappable when onTap is set', (tester) async {
    var taps = 0;
    await pumpApp(
      tester,
      AppCard(child: const Text('Open'), onTap: () => taps++),
    );
    await tester.tap(find.text('Open'));
    expect(taps, 1);
  });
}
