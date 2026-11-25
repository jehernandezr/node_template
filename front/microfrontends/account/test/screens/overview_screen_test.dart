import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/screens.dart';
import 'package:mf_account/src/screens/widgets/account_widgets.dart';
import 'package:mf_account/src/shared/types/account_types.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/test_app.dart';

class _FailingRepository extends FakeAccountRepository {
  _FailingRepository(this.error) : super();

  final Object error;

  @override
  Future<AccountProfile> loadProfile() => Future.error(error);
}

void main() {
  testWidgets('shows loading and then the profile with links', (tester) async {
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

  testWidgets('shows a generic error with retry when loading fails', (
    tester,
  ) async {
    final es = await loadEs();
    final shared = await loadSharedEs();
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: _FailingRepository(Exception('boom')),
          onSignOut: () async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text(es.loadError), findsOneWidget);
    expect(find.text(shared.actionRetry), findsOneWidget);
  });

  testWidgets('an ApiErrorException shows the code and the trace', (
    tester,
  ) async {
    final es = await loadEs();
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
    expect(find.text(es.loadError), findsOneWidget);
    expect(
      find.textContaining('${shared.errorCodeLabel}: PLATFORM.AUTH.FORBIDDEN'),
      findsOneWidget,
    );
    expect(
      find.textContaining('${shared.errorTraceIdLabel}: trace-123'),
      findsOneWidget,
    );
  });

  testWidgets('signing out calls onSignOut', (tester) async {
    final shared = await loadSharedEs();
    var signOuts = 0;
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: FakeAccountRepository(),
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

  testWidgets('meets the accessibility guidelines', (tester) async {
    await tester.pumpWidget(
      testApp(
        AccountOverviewScreen(
          repository: FakeAccountRepository(),
          onSignOut: () async {},
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
        AccountOverviewScreen(
          repository: FakeAccountRepository(),
          onSignOut: () async {},
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
