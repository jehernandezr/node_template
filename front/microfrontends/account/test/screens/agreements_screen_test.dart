import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:ui/ui.dart';

import '../support/test_app.dart';

void main() {
  testWidgets('muestra cargando y luego pendientes y aceptados', (tester) async {
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
          repository: FakeAccountRepository(
            delay: Duration.zero,
            pendingAgreements: [],
          ),
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
      testApp(
        AgreementsScreen(
          repository: FakeAccountRepository(delay: Duration.zero),
        ),
      ),
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
}
