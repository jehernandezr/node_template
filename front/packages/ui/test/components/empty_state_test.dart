import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  testWidgets('shows icon, title and message', (tester) async {
    await pumpApp(
      tester,
      const EmptyState(
        icon: Icons.inbox_outlined,
        title: 'No tasks',
        message: 'Create your first task.',
      ),
    );
    expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
    expect(find.text('No tasks'), findsOneWidget);
    expect(find.text('Create your first task.'), findsOneWidget);
    expect(find.byType(AppButton), findsNothing);
  });

  testWidgets('shows the action and calls it when tapped', (tester) async {
    var taps = 0;
    await pumpApp(
      tester,
      EmptyState(
        icon: Icons.inbox_outlined,
        title: 'No tasks',
        actionLabel: 'Create',
        onAction: () => taps++,
      ),
    );
    await tester.tap(find.text('Create'));
    expect(taps, 1);
  });

  testWidgets('hides the action when the callback is missing', (tester) async {
    await pumpApp(
      tester,
      const EmptyState(
        icon: Icons.inbox_outlined,
        title: 'No tasks',
        actionLabel: 'Create',
      ),
    );
    expect(find.text('Create'), findsNothing);
  });
}
