import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/mobile_shell.dart';
import 'package:mobile_shell/src/shell/mobile_shell_scaffold.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/menu_manifests.dart';
import '../utils/mobile_shell_fixture.dart';

void main() {
  group(MobileShellScaffold, () {
    testWidgets(
      'a location that only shares a prefix does not select the entry',
      (tester) async {
        final fixture = MobileShellFixture();
        fixture.usePhoneInSpanish(tester);
        final host = buildMobileHost();
        host.session.value = SessionBuilder(
          userId: 'u1',
          tenantId: 't1',
        ).withPermissions(const [Permission.tasksRead]).build();
        final tasksIndex = host.menu.indexWhere((e) => e.path == '/tasks');
        expect(tasksIndex, greaterThan(0));

        try {
          await tester.pumpWidget(
            TestApp().wrap(
              MobileShellScaffold(
                host: host,
                location: '/tasks2',
                child: const SizedBox.shrink(),
              ),
            ),
          );
          await tester.pump();
          expect(
            tester
                .widget<NavigationBar>(find.byType(NavigationBar))
                .selectedIndex,
            isNot(tasksIndex),
          );

          await tester.pumpWidget(
            TestApp().wrap(
              MobileShellScaffold(
                host: host,
                location: '/tasks/42',
                child: const SizedBox.shrink(),
              ),
            ),
          );
          await tester.pump();
          expect(
            tester
                .widget<NavigationBar>(find.byType(NavigationBar))
                .selectedIndex,
            tasksIndex,
          );
        } finally {
          await fixture.settleRuntime(tester, host);
          await tester.pumpWidget(const SizedBox.shrink());
          unawaited(host.dispose());
        }
      },
    );

    testWidgets(
      'with more than five entries the bar shows four and a More slot',
      (tester) async {
        await MobileShellFixture(appManifests: const []).run(
          tester,
          ShellScenarioSetup(
            manifests: const MenuManifests(count: 6).build(),
            clock: FakeClock(),
            session: SessionBuilder().build(),
            initialLocation: '/m0',
          ),
          (host) async {
            expect(find.text('Más'), findsOneWidget);
            expect(find.text('Entrada 4'), findsNothing);

            await tester.tap(find.text('Más'));
            await tester.pumpAndSettle();
            expect(find.text('Entrada 4'), findsOneWidget);
            expect(find.text('Entrada 5'), findsOneWidget);

            await tester.tap(find.text('Entrada 5'));
            await tester.pumpAndSettle();
            expect(host.router.state.uri.path, '/m5');
            expect(
              tester
                  .widget<NavigationBar>(find.byType(NavigationBar))
                  .selectedIndex,
              4,
            );
          },
        );
      },
    );
  });
}
