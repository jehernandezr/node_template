import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

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

  testWidgets('is a live region labeled with the loading text', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester, const LoadingView());
    expect(
      tester.getSemantics(find.byType(LoadingView)),
      isSemantics(isLiveRegion: true, label: 'Cargando'),
    );
    handle.dispose();
  });

  testWidgets('keeps the message after the loading label', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester, const LoadingView(message: 'Un momento'));
    expect(
      tester.getSemantics(find.byType(LoadingView)),
      isSemantics(label: 'Cargando\nUn momento'),
    );
    handle.dispose();
  });

  testWidgets('renders without AppLocalizations installed', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: LoadingView())),
    );
    expect(tester.takeException(), isNull);
  });
}
