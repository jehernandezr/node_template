import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/test_app.dart';

void main() {
  testWidgets('shows loading and then MFA and passkeys', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.textContaining('App de autenticación'), findsOneWidget);
    expect(find.text('Passkey de MacBook'), findsOneWidget);
    expect(find.text(es.passkeyAdd), findsOneWidget);
  });

  testWidgets('shows empty state for passkeys', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(passkeys: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.passkeysEmpty), findsOneWidget);
  });

  testWidgets('adding a passkey requests MFA and shows it in the list', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.passkeyAdd));
    await tester.pumpAndSettle();
    expect(find.text('Nueva passkey 2'), findsOneWidget);
  });

  testWidgets('regenerating codes requests MFA and shows the new ones', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.recoveryRegenerate));
    await tester.pumpAndSettle();
    expect(find.text(es.recoveryCodesTitle), findsOneWidget);
    expect(find.text('AB100-CD200'), findsOneWidget);
  });

  group(SecurityScreen, () {
    testWidgets('meets the accessibility guidelines', (tester) async {
      await tester.pumpWidget(
        testApp(
          SecurityScreen(
            requestStepUp: approveStepUp,
            repository: FakeAccountRepository(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await expectAccessible(tester);
    });

    testWidgets('keeps the content centered and narrow on wide windows', (
      tester,
    ) async {
      await pumpAtWidths(
        tester,
        testApp(
          SecurityScreen(
            requestStepUp: approveStepUp,
            repository: FakeAccountRepository(),
          ),
        ),
        widths: const [320, 800, 1280],
        check: (width) async {
          await tester.pumpAndSettle();
          final card = find.byType(AppCard).first;
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

    testWidgets('shows the new codes in a dialog with the account texts', (
      tester,
    ) async {
      final es = await loadEs();
      final clock = FakeClock();
      await tester.pumpWidget(
        testApp(
          SecurityScreen(
            requestStepUp: approveStepUp,
            repository: FakeAccountRepository(),
          ),
          session: testSession(mfaFresh: true, clock: clock),
          clock: clock,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(es.recoveryRegenerate));
      await tester.pumpAndSettle();
      expect(find.text(es.recoveryCodesTitle), findsOneWidget);
      expect(find.text('AB100-CD200'), findsOneWidget);
      await tester.tap(find.text((await loadSharedEs()).close));
      await tester.pumpAndSettle();
      expect(find.text(es.recoveryCodesTitle), findsNothing);
    });
  });
}
