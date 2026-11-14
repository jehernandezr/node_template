import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/shared/types/account_types.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:ui/ui.dart';

import '../support/test_app.dart';

class _FailingRepository extends FakeAccountRepository {
  _FailingRepository(this.error) : super(delay: Duration.zero);

  final Object error;

  @override
  Future<AccountProfile> loadProfile() => Future.error(error);
}

void main() {
  testWidgets('muestra cargando y luego el perfil con enlaces', (tester) async {
    final es = await loadEs();
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: FakeAccountRepository(),
          onSignOut: () async {},
        ),
      ),
    );
    expect(find.byType(LoadingView), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text(es.overviewTitle), findsOneWidget);
    expect(find.text('Ana Pérez'), findsOneWidget);
    expect(find.text('ana@ejemplo.com'), findsOneWidget);
    expect(find.text(es.organizationLine('Organización demo')), findsOneWidget);
    expect(find.text(es.sessionsTitle), findsOneWidget);
    expect(find.text(es.devicesLinkTitle), findsOneWidget);
    expect(find.text(es.securityLinkTitle), findsOneWidget);
    expect(find.text(es.agreementsLinkTitle), findsOneWidget);
  });

  testWidgets('muestra error genérico con reintento si falla la carga', (
    tester,
  ) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: _FailingRepository(StateError('boom')),
          onSignOut: () async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text(es.loadError), findsOneWidget);
    expect(find.text(shared.actionRetry), findsOneWidget);
  });

  testWidgets('un ApiErrorException muestra el código y la traza', (
    tester,
  ) async {
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: _FailingRepository(testApiError()),
          onSignOut: () async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text(shared.error_platform_auth_forbidden), findsOneWidget);
    expect(
      find.textContaining('${shared.errorCodeLabel}: PLATFORM.AUTH.FORBIDDEN'),
      findsOneWidget,
    );
    expect(
      find.textContaining('${shared.errorTraceIdLabel}: trace-123'),
      findsOneWidget,
    );
  });

  testWidgets('cerrar sesión llama a onSignOut', (tester) async {
    final shared = await loadSharedEs();
    var signOuts = 0;
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: FakeAccountRepository(delay: Duration.zero),
          onSignOut: () async => signOuts++,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text(shared.actionSignOut), 100);
    await tester.tap(find.text(shared.actionSignOut));
    await tester.pumpAndSettle();
    expect(signOuts, 1);
  });
}
