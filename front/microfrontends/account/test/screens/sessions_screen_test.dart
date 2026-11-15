import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:mf_account/src/screens/widgets/account_widgets.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/recording_step_up.dart';
import '../utils/test_app.dart';

class _FlakyRepository extends FakeAccountRepository {
  _FlakyRepository({this.failList = false, this.failRevoke = false}) : super();

  final bool failList;
  final bool failRevoke;

  @override
  Future<List<SessionSummary>> listSessions() =>
      failList ? Future.error(testApiError()) : super.listSessions();

  @override
  Future<void> revokeSession(String sessionId) => failRevoke
      ? Future.error(testApiError())
      : super.revokeSession(sessionId);
}

void main() {
  testWidgets('muestra cargando y luego las sesiones', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
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
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(sessions: []),
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
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
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

  testWidgets('cerrar todas las demás pide MFA y deja solo la actual', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);
    expect(find.text('App en Pixel 8'), findsNothing);
    expect(find.text('Chrome en MacBook'), findsOneWidget);
    expect(find.text(es.sessionClose), findsNothing);
  });

  testWidgets('un error de carga muestra el error con código y reintento', (
    tester,
  ) async {
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: approveStepUp,
          repository: _FlakyRepository(failList: true),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text(shared.actionRetry), findsOneWidget);
    expect(
      find.textContaining('${shared.errorCodeLabel}: PLATFORM.AUTH.FORBIDDEN'),
      findsOneWidget,
    );
  });

  testWidgets('un error al cerrar una sesión muestra un aviso y deja la fila', (
    tester,
  ) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: approveStepUp,
          repository: _FlakyRepository(failRevoke: true),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();
    expect(find.textContaining(es.actionFailed), findsOneWidget);
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  testWidgets('con segundo factor reciente no pide el step-up', (tester) async {
    final es = await loadEs();
    final stepUp = RecordingStepUp();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: stepUp.call,
          repository: FakeAccountRepository(),
        ),
        session: testSession(mfaFresh: true),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();
    expect(stepUp.calls, 0);
    expect(find.text('Safari en iPhone'), findsNothing);
    expect(find.text('Chrome en MacBook'), findsOneWidget);
  });

  testWidgets('sin segundo factor reciente pide el step-up del shell', (
    tester,
  ) async {
    final es = await loadEs();
    final stepUp = RecordingStepUp();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: stepUp.call,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();
    expect(stepUp.calls, 1);
    expect(find.text('Safari en iPhone'), findsNothing);
  });

  testWidgets('si el step-up no se completa, no cierra nada', (tester) async {
    final es = await loadEs();
    final stepUp = RecordingStepUp(answer: false);
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: stepUp.call,
          repository: FakeAccountRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();
    expect(stepUp.calls, 1);
    expect(find.text('Safari en iPhone'), findsOneWidget);
    expect(find.text('App en Pixel 8'), findsOneWidget);
  });

  testWidgets('los textos salen en inglés con el locale en', (tester) async {
    final en = await loadEn();
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
          requestStepUp: approveStepUp,
          repository: FakeAccountRepository(),
        ),
        locale: const Locale('en'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(en.sessionsTitle), findsOneWidget);
    expect(find.text(en.sessionCurrent), findsOneWidget);
  });

  testWidgets('meets the accessibility guidelines', (tester) async {
    await tester.pumpWidget(
      testApp(
        SessionsScreen(
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
        SessionsScreen(
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
