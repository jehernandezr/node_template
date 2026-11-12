import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:ui/ui.dart';

import '../support/test_app.dart';

void main() {
  testWidgets('muestra cargando y luego las sesiones', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(SessionsScreen(repository: FakeAccountRepository())),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('Chrome en MacBook'), findsOneWidget);
    expect(find.text('Safari en iPhone'), findsOneWidget);
    expect(find.text(es.sessionCurrent), findsOneWidget);
    expect(find.text(es.sessionClose), findsNWidgets(2));
  });

  testWidgets('muestra estado vacío sin sesiones', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          repository: FakeAccountRepository(delay: Duration.zero, sessions: []),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(es.sessionsEmptyTitle), findsOneWidget);
  });

  testWidgets('cerrar sesión quita la fila', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          repository: FakeAccountRepository(delay: Duration.zero),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);
    expect(find.text('App en Pixel 8'), findsOneWidget);
    expect(find.text(es.sessionClose), findsOneWidget);
  });

  testWidgets('cerrar todas las demás pide MFA y deja solo la actual',
      (tester) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          repository: FakeAccountRepository(delay: Duration.zero),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      FakeAccountRepository.validStepUpCode,
    );
    await tester.tap(find.text(shared.confirm));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);
    expect(find.text('App en Pixel 8'), findsNothing);
    expect(find.text('Chrome en MacBook'), findsOneWidget);
    expect(find.text(es.sessionClose), findsNothing);
  });
}
