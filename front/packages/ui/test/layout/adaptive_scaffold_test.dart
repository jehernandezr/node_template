import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

const _destinations = [
  AdaptiveDestination(label: 'Home', icon: Icons.home_outlined),
  AdaptiveDestination(label: 'Tasks', icon: Icons.check_box_outlined),
  AdaptiveDestination(label: 'Account', icon: Icons.person_outline),
];

void main() {
  Future<void> pumpAdaptive(
    WidgetTester tester, {
    required ValueChanged<int> onSelected,
  }) {
    return tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: AdaptiveScaffold(
          destinations: _destinations,
          selectedIndex: 0,
          onSelected: onSelected,
          body: const Text('BODY'),
        ),
      ),
    );
  }

  testWidgets('compact width shows a bottom NavigationBar', (tester) async {
    setSurface(tester, 400);
    await pumpAdaptive(tester, onSelected: (_) {});

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.text('BODY'), findsOneWidget);
  });

  testWidgets('medium width shows a collapsed NavigationRail', (tester) async {
    setSurface(tester, 800);
    await pumpAdaptive(tester, onSelected: (_) {});

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isFalse);
    expect(find.text('BODY'), findsOneWidget);
  });

  testWidgets('expanded width shows an extended NavigationRail', (
    tester,
  ) async {
    setSurface(tester, 1200);
    await pumpAdaptive(tester, onSelected: (_) {});

    expect(find.byType(NavigationRail), findsOneWidget);
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isTrue);
    expect(find.text('Tasks'), findsOneWidget);
  });

  testWidgets('switches layout when the width crosses breakpoints', (
    tester,
  ) async {
    setSurface(tester, 400);
    await pumpAdaptive(tester, onSelected: (_) {});
    expect(find.byType(NavigationBar), findsOneWidget);

    tester.view.physicalSize = const Size(700, 800);
    await tester.pumpAndSettle();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);

    tester.view.physicalSize = const Size(1100, 800);
    await tester.pumpAndSettle();
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
      isTrue,
    );
  });

  testWidgets('tapping a destination reports its index on compact', (
    tester,
  ) async {
    setSurface(tester, 400);
    int? selected;
    await pumpAdaptive(tester, onSelected: (index) => selected = index);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(selected, 2);
  });

  testWidgets('tapping a destination reports its index on expanded', (
    tester,
  ) async {
    setSurface(tester, 1200);
    int? selected;
    await pumpAdaptive(tester, onSelected: (index) => selected = index);

    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();
    expect(selected, 1);
  });

  testWidgets('badge shows on NavigationBar and hides for 0', (tester) async {
    setSurface(tester, 400);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: AdaptiveScaffold(
          destinations: const [
            AdaptiveDestination(label: 'Home', icon: Icons.home_outlined),
            AdaptiveDestination(
              label: 'Tasks',
              icon: Icons.check_box_outlined,
              badgeCount: 3,
            ),
            AdaptiveDestination(
              label: 'Account',
              icon: Icons.person_outline,
              badgeCount: 0,
            ),
          ],
          selectedIndex: 0,
          onSelected: (_) {},
          body: const Text('BODY'),
        ),
      ),
    );
    expect(find.byType(Badge), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('badge shows on NavigationRail and hides when null', (
    tester,
  ) async {
    setSurface(tester, 1200);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: AdaptiveScaffold(
          destinations: const [
            AdaptiveDestination(
              label: 'Home',
              icon: Icons.home_outlined,
              badgeCount: 5,
            ),
            AdaptiveDestination(label: 'Tasks', icon: Icons.check_box_outlined),
          ],
          selectedIndex: 0,
          onSelected: (_) {},
          body: const Text('BODY'),
        ),
      ),
    );
    expect(find.byType(Badge), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isTrue);
  });

  testWidgets('railTrailing shows on medium and expanded only', (tester) async {
    const trailing = Text('TRAILING', key: Key('trailing'));
    Future<void> pump(double width) async {
      setSurface(tester, width);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: AdaptiveScaffold(
            destinations: _destinations,
            selectedIndex: 0,
            onSelected: (_) {},
            body: const Text('BODY'),
            railTrailing: trailing,
          ),
        ),
      );
    }

    await pump(800);
    expect(find.byKey(const Key('trailing')), findsOneWidget);

    await pump(1200);
    expect(find.byKey(const Key('trailing')), findsOneWidget);

    await pump(400);
    expect(find.byKey(const Key('trailing')), findsNothing);
  });

  testWidgets('compactActions show in a top bar on compact only', (
    tester,
  ) async {
    final actions = [
      IconButton(
        key: const Key('sign-out'),
        icon: const Icon(Icons.logout),
        onPressed: () {},
      ),
    ];
    Future<void> pump(double width) async {
      setSurface(tester, width);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: AdaptiveScaffold(
            destinations: _destinations,
            selectedIndex: 0,
            onSelected: (_) {},
            body: const Text('BODY'),
            compactActions: actions,
          ),
        ),
      );
    }

    await pump(400);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.byKey(const Key('sign-out')), findsOneWidget);

    await pump(800);
    expect(find.byType(AppBar), findsNothing);
    expect(find.byKey(const Key('sign-out')), findsNothing);
  });
}
