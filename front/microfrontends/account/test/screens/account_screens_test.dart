import 'package:api/api.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/data/account_data.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/account_screens.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/recording_step_up.dart';
import '../utils/test_app.dart';

void main() {
  testWidgets('revoking a session in one scope does not affect a new scope', (
    tester,
  ) async {
    final es = await loadEs();
    final scopeA = testScope();
    await tester.pumpWidget(testApp(AccountScreens.sessions(scopeA)));
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);

    // A new scope has its own repository with the sample data.
    await tester.pumpWidget(const SizedBox());
    final scopeB = testScope();
    await tester.pumpWidget(testApp(AccountScreens.sessions(scopeB)));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  testWidgets('the screen reuses the repository of the same scope', (
    tester,
  ) async {
    final es = await loadEs();
    final scope = testScope();
    await tester.pumpWidget(testApp(AccountScreens.sessions(scope)));
    await tester.pumpAndSettle();
    await tester.tap(find.text(es.sessionClose).first);
    await tester.pumpAndSettle();

    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(testApp(AccountScreens.sessions(scope)));
    await tester.pumpAndSettle();
    expect(find.text('Safari en iPhone'), findsNothing);
  });

  testWidgets('signing out of the account calls services.signOut', (
    tester,
  ) async {
    final shared = await loadSharedEs();
    var signOuts = 0;
    final scope = testScope(onSignOut: () async => signOuts++);
    await tester.pumpWidget(testApp(AccountScreens.overview(scope)));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text(shared.actionSignOut), 100);
    await tester.tap(find.text(shared.actionSignOut));
    await tester.pumpAndSettle();
    expect(signOuts, 1);
  });

  testWidgets('closing the scope releases the repository', (tester) async {
    final scope = testScope();
    await tester.pumpWidget(testApp(AccountScreens.sessions(scope)));
    await tester.pumpAndSettle();
    final repository = scope.repository(AccountData.repository);
    expect((repository as FakeAccountRepository).isDisposed, isFalse);
    await scope.dispose();
    expect(repository.isDisposed, isTrue);
  });

  testWidgets('sensitive actions request the step-up from the services', (
    tester,
  ) async {
    final es = await loadEs();
    final stepUp = RecordingStepUp(answer: false);
    final scope = testScope(onStepUp: stepUp.call);
    addTearDown(scope.dispose);
    await tester.pumpWidget(testApp(AccountScreens.sessions(scope)));
    await tester.pumpAndSettle();

    await tester.tap(find.text(es.sessionsCloseOthers));
    await tester.pumpAndSettle();

    expect(stepUp.calls, 1);
    expect(find.text('Safari en iPhone'), findsOneWidget);
  });

  group('in live mode', () {
    ApiClient client() => ApiClient(
      transport: ScriptedTransport(),
      baseUri: Uri.parse('https://api.example.com'),
      accessToken: () async => 'token',
    );

    testWidgets('security, without a contract, is shown as unavailable', (
      tester,
    ) async {
      final es = await loadEs();
      final scope = liveScope(client());
      addTearDown(scope.dispose);
      await tester.pumpWidget(
        testApp(AccountScreens.security(scope), session: testSession()),
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('account-security-unavailable')),
        findsOneWidget,
      );
      expect(find.text(es.sectionUnavailableMessage), findsOneWidget);
    });

    testWidgets(
      'the account offers no profile or sections without a contract',
      (tester) async {
        final es = await loadEs();
        final scope = liveScope(client());
        addTearDown(scope.dispose);
        await tester.pumpWidget(testApp(AccountScreens.overview(scope)));
        await tester.pumpAndSettle();

        expect(find.text(es.sessionsTitle), findsWidgets);
        expect(find.text(es.securityLinkTitle), findsNothing);
        expect(find.text(es.agreementsLinkTitle), findsNothing);
        expect(find.text('Ana Pérez'), findsNothing);
      },
    );
  });
}
