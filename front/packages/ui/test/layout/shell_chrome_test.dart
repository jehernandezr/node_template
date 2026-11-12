import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

const _destinations = [
  AdaptiveDestination(label: 'Cuenta', icon: Icons.person),
  AdaptiveDestination(label: 'Tareas', icon: Icons.check),
];

Widget _signOut() => IconButton(
  tooltip: 'Salir',
  icon: const Icon(Icons.logout),
  onPressed: () {},
);

Future<void> _pumpChrome(
  WidgetTester tester, {
  List<AdaptiveDestination> destinations = _destinations,
  Widget page = const AppPage(title: 'Tareas', body: Text('contenido')),
}) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light(),
    home: ShellChrome(
      destinations: destinations,
      selectedIndex: 0,
      onSelected: (_) {},
      actions: [_signOut()],
      body: page,
    ),
  ),
);

Finder _inAppBar(Finder finder) =>
    find.descendant(of: find.byType(AppBar), matching: finder);

void main() {
  testWidgets(
    'compact: bottom navigation, one top bar from the page with the shell action',
    (tester) async {
      setSurface(tester, 400);
      await _pumpChrome(tester);

      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
      expect(_inAppBar(find.text('Tareas')), findsOneWidget);
      expect(_inAppBar(find.byTooltip('Salir')), findsOneWidget);
    },
  );

  testWidgets('expanded: rail holds the shell action, the page bar does not', (
    tester,
  ) async {
    setSurface(tester, 1200);
    await _pumpChrome(tester);

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(_inAppBar(find.byTooltip('Salir')), findsNothing);
    expect(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byTooltip('Salir'),
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    'fewer than two destinations: no navigation, actions go to the page',
    (tester) async {
      setSurface(tester, 1200);
      await _pumpChrome(tester, destinations: _destinations.take(1).toList());

      expect(find.byType(NavigationRail), findsNothing);
      expect(find.byType(NavigationBar), findsNothing);
      expect(_inAppBar(find.byTooltip('Salir')), findsOneWidget);
    },
  );

  testWidgets('a legacy page without AppPage gets no bar from the shell', (
    tester,
  ) async {
    setSurface(tester, 400);
    await _pumpChrome(tester, page: const Text('pantalla antigua'));

    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('pageActionsOf is empty outside a ShellChrome', (tester) async {
    late List<Widget> actions;
    await pumpApp(
      tester,
      Builder(
        builder: (context) {
          actions = ShellChrome.pageActionsOf(context);
          return const SizedBox();
        },
      ),
    );
    expect(actions, isEmpty);
  });
}
