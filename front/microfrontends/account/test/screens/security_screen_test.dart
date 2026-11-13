import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:ui/ui.dart';

import '../support/test_app.dart';

void main() {
  testWidgets('muestra cargando y luego MFA y passkeys', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(SecurityScreen(repository: FakeAccountRepository())),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.textContaining('App de autenticación'), findsOneWidget);
    expect(find.text('Passkey de MacBook'), findsOneWidget);
    expect(find.text(es.passkeyAdd), findsOneWidget);
  });

  testWidgets('muestra estado vacío de passkeys', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(
          repository: FakeAccountRepository(delay: Duration.zero, passkeys: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.passkeysEmpty), findsOneWidget);
  });

  testWidgets('agregar passkey pide MFA y la muestra en la lista', (
    tester,
  ) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(repository: FakeAccountRepository(delay: Duration.zero)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.passkeyAdd));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      FakeAccountRepository.validStepUpCode,
    );
    await tester.tap(find.text(shared.confirm));
    await tester.pumpAndSettle();
    expect(find.text('Nueva passkey 2'), findsOneWidget);
  });

  testWidgets('regenerar códigos pide MFA y muestra los nuevos', (
    tester,
  ) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        SecurityScreen(repository: FakeAccountRepository(delay: Duration.zero)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.recoveryRegenerate));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      FakeAccountRepository.validStepUpCode,
    );
    await tester.tap(find.text(shared.confirm));
    await tester.pumpAndSettle();
    expect(find.text(es.recoveryCodesTitle), findsOneWidget);
    expect(find.text('AB100-CD200'), findsOneWidget);
  });
}
