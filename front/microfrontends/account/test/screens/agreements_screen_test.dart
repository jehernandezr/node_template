import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:mf_account/src/screens/widgets/account_widgets.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/test_app.dart';

void main() {
  testWidgets('muestra cargando y luego pendientes y aceptados', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(AgreementsScreen(repository: FakeAccountRepository())),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('Política de privacidad'), findsOneWidget);
    expect(find.text('Consentimiento de marketing'), findsOneWidget);
    expect(find.text('Términos de servicio'), findsOneWidget);
    expect(find.text(es.reviewAndAccept), findsNWidgets(2));
  });

  testWidgets('muestra estado vacío sin pendientes', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        AgreementsScreen(
          repository: FakeAccountRepository(pendingAgreements: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.pendingEmptyTitle), findsOneWidget);
    expect(find.text(es.reviewAndAccept), findsNothing);
  });

  testWidgets('aceptar un acuerdo lo mueve al historial', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(AgreementsScreen(repository: FakeAccountRepository())),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.reviewAndAccept).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.accept));
    await tester.pumpAndSettle();
    expect(find.text(es.reviewAndAccept), findsOneWidget);
    expect(find.text('Política de privacidad'), findsOneWidget);
    expect(find.textContaining(es.versionLabel('')), findsWidgets);
  });

  group(AgreementsScreen, () {
    testWidgets('meets the accessibility guidelines', (tester) async {
      await tester.pumpWidget(
        testApp(AgreementsScreen(repository: FakeAccountRepository())),
      );
      await tester.pumpAndSettle();
      await expectAccessible(tester);
    });

    testWidgets('keeps the content centered and narrow on wide windows', (
      tester,
    ) async {
      await pumpAtWidths(
        tester,
        testApp(AgreementsScreen(repository: FakeAccountRepository())),
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

    testWidgets('the review dialog explains the version', (tester) async {
      final es = await loadEs();
      await tester.pumpWidget(
        testApp(AgreementsScreen(repository: FakeAccountRepository())),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(es.reviewAndAccept).first);
      await tester.pumpAndSettle();
      expect(find.text(es.reviewDialogMessage('2.1')), findsOneWidget);
      await tester.tap(find.text((await loadSharedEs()).actionCancel));
      await tester.pumpAndSettle();
      expect(find.text(es.reviewAndAccept), findsNWidgets(2));
    });
  });
}
