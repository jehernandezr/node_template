import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  testWidgets('shows a spinner without a message', (tester) async {
    await pumpApp(tester, const LoadingView());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(Text), findsNothing);
  });

  testWidgets('shows the message under the spinner', (tester) async {
    await pumpApp(tester, const LoadingView(message: 'Loading tasks'));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Loading tasks'), findsOneWidget);
  });
}
