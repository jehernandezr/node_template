import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:mf_account/src/screens/widgets/account_widgets.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/test_app.dart';

void main() {
  testWidgets('shows loading and then devices with verifier', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsOneWidget);
    expect(find.text(es.verifierBadge), findsOneWidget);
    expect(find.text(es.deviceRemove), findsNWidgets(2));
  });

  testWidgets('shows empty state with no devices', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(devices: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.devicesEmptyTitle), findsOneWidget);
  });

  testWidgets('removing trust requests MFA and removes the device', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.deviceRemove).last);
    await tester.pumpAndSettle();
    expect(find.text('App en Pixel 8'), findsNothing);
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  testWidgets('meets the accessibility guidelines', (tester) async {
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await expectAccessible(tester);
  });

  testWidgets('keeps the list centered and narrow on wide windows', (
    tester,
  ) async {
    await pumpAtWidths(
      tester,
      testApp(
        DevicesScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
      widths: const [320, 800, 1280],
      check: (width) async {
        await tester.pumpAndSettle();
        final card = find.byType(AccountRowCard).first;
        expect(
          tester.getSize(card).width,
          lessThanOrEqualTo(AppLayout.readingWidth),
        );
        if (width == 1280) {
          expect(tester.getCenter(card).dx, closeTo(640, 1));
        }
      },
    );
  });
}
