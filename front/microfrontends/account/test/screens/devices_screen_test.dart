import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:ui/ui.dart';

import '../support/test_app.dart';

void main() {
  testWidgets('muestra cargando y luego dispositivos con verificador',
      (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(DevicesScreen(repository: FakeAccountRepository())),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsOneWidget);
    expect(find.text(es.verifierBadge), findsOneWidget);
    expect(find.text(es.deviceRemove), findsNWidgets(2));
  });

  testWidgets('muestra estado vacío sin dispositivos', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          repository: FakeAccountRepository(delay: Duration.zero, devices: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.devicesEmptyTitle), findsOneWidget);
  });

  testWidgets('quitar confianza pide MFA y quita el dispositivo',
      (tester) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        DevicesScreen(
          repository: FakeAccountRepository(delay: Duration.zero),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.deviceRemove).last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      FakeAccountRepository.validStepUpCode,
    );
    await tester.tap(find.text(shared.confirm));
    await tester.pumpAndSettle();
    expect(find.text('App en Pixel 8'), findsNothing);
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });
}
