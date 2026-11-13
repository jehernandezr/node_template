import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

void main() {
  testWidgets('shows title, actions and body in a single top bar', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AppPage(
          title: 'Tareas',
          actions: [
            IconButton(
              tooltip: 'Buscar',
              icon: const Icon(Icons.search),
              onPressed: () {},
            ),
          ],
          floatingActionButton: FloatingActionButton(
            onPressed: () {},
            child: const Icon(Icons.add),
          ),
          body: const Text('lista'),
        ),
      ),
    );

    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Tareas'), findsOneWidget);
    expect(find.byTooltip('Buscar'), findsOneWidget);
    expect(find.text('lista'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsOneWidget);
    expect(find.byType(BackButton), findsNothing, reason: 'nothing to pop');
  });

  testWidgets('onBack shows a back button that calls it', (tester) async {
    var backs = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: AppPage(
          title: 'Detalle',
          onBack: () => backs++,
          body: const SizedBox(),
        ),
      ),
    );

    await tester.tap(find.byType(BackButton));
    expect(backs, 1);
  });

  testWidgets('a pushed page gets the automatic back button', (tester) async {
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        home: const AppPage(title: 'Lista', body: SizedBox()),
      ),
    );
    navigator.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => const AppPage(title: 'Detalle', body: SizedBox()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(BackButton), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text('Lista'), findsOneWidget);
  });
}
