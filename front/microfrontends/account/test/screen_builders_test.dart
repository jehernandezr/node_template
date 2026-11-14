import 'package:api/api.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/account_repository.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screen_builders.dart';

import 'utils/test_app.dart';

void main() {
  testWidgets('revocar una sesión en un scope no afecta a un scope nuevo', (
    tester,
  ) async {
    final es = await loadEs();
    final scopeA = testScope();
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scopeA)));
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);

    // Un scope nuevo tiene su propio repositorio con los datos de ejemplo.
    await tester.pumpWidget(const SizedBox());
    final scopeB = testScope();
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scopeB)));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  testWidgets('la pantalla reusa el repositorio del mismo scope', (
    tester,
  ) async {
    final es = await loadEs();
    final scope = testScope();
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scope)));
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();

    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scope)));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);
  });

  testWidgets('cerrar sesión de la cuenta llama a services.signOut', (
    tester,
  ) async {
    final shared = await loadSharedEs();
    var signOuts = 0;
    final scope = testScope(onSignOut: () async => signOuts++);
    await tester.pumpWidget(testApp(buildAccountOverviewScreen(scope)));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text(shared.actionSignOut), 100);
    await tester.tap(find.text(shared.actionSignOut));
    await tester.pumpAndSettle();
    expect(signOuts, 1);
  });

  testWidgets('cerrar el scope libera el repositorio', (tester) async {
    final scope = testScope();
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scope)));
    await tester.pumpAndSettle();
    final repository = scope.get<AccountRepository>(
      (_) => throw StateError('el repositorio ya debería existir'),
    );
    expect((repository as FakeAccountRepository).isDisposed, isFalse);
    await scope.dispose();
    expect(repository.isDisposed, isTrue);
  });

  testWidgets('las acciones sensibles piden el step-up de los servicios', (
    tester,
  ) async {
    final es = await loadEs();
    final stepUp = RecordingStepUp(answer: false);
    final scope = testScope(onStepUp: stepUp.call);
    addTearDown(scope.dispose);
    await tester.pumpWidget(testApp(buildAccountSessionsScreen(scope)));
    await tester.pumpAndSettle();

    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();

    expect(stepUp.calls, 1);
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  group('en modo vivo', () {
    ApiClient client() => ApiClient(
      transport: _NoNetwork(),
      baseUri: Uri.parse('https://api.example.com'),
      accessToken: () async => 'token',
    );

    testWidgets('seguridad, sin contrato, se muestra como no disponible', (
      tester,
    ) async {
      final es = await loadEs();
      final scope = liveScope(client());
      addTearDown(scope.dispose);
      await tester.pumpWidget(
        testApp(buildAccountSecurityScreen(scope), session: testSession()),
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('account-security-unavailable')),
        findsOneWidget,
      );
      expect(find.text(es.sectionUnavailableMessage), findsOneWidget);
    });

    testWidgets('la cuenta no ofrece perfil ni secciones sin contrato', (
      tester,
    ) async {
      final es = await loadEs();
      final scope = liveScope(client());
      addTearDown(scope.dispose);
      await tester.pumpWidget(testApp(buildAccountOverviewScreen(scope)));
      await tester.pumpAndSettle();

      expect(find.text(es.sessionsTitle), findsWidgets);
      expect(find.text(es.securityLinkTitle), findsNothing);
      expect(find.text(es.agreementsLinkTitle), findsNothing);
      expect(find.text('Ana Pérez'), findsNothing);
    });
  });
}

/// Transporte que nunca debería usarse en estas pruebas.
class _NoNetwork implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) =>
      throw StateError('sin red en esta prueba');

  @override
  void close() {}
}
