import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_host/src/pages/sign_in_form.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/flow_harness.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('es'));
  const emailKey = ValueKey('sign-in-email');
  const passwordKey = ValueKey('sign-in-password');
  const codeKey = ValueKey('sign-in-code');
  const errorKey = ValueKey('sign-in-error');

  group('SignInForm', () {
    testWidgets('starts with email and password, and Next moves to password', (
      tester,
    ) async {
      final harness = FlowHarness();
      addTearDown(harness.dispose);
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: SignInForm(
                connection: harness.connection,
                onSignedIn: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(emailKey), findsOneWidget);
      expect(find.byKey(passwordKey), findsOneWidget);
      expect(find.text(l10n.actionSignIn), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byKey(emailKey)).textInputAction,
        TextInputAction.next,
      );
      await expectAccessible(tester);
    });

    testWidgets('wrong credentials show the error of the identity code', (
      tester,
    ) async {
      final harness = FlowHarness();
      addTearDown(harness.dispose);
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: SignInForm(
                connection: harness.connection,
                onSignedIn: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(emailKey), 'ana@example.com');
      await tester.enterText(find.byKey(passwordKey), 'secret-1');
      await tester.tap(find.text(l10n.actionSignIn));
      await tester.pumpAndSettle();

      expect(find.byKey(errorKey), findsOneWidget);
      expect(
        find.text(
          errorMessage(l10n, IdentityErrorCode.authInvalidCredentials.code),
        ),
        findsOneWidget,
      );
      await expectAccessible(tester);
    });

    testWidgets('a required second factor offers its methods', (tester) async {
      final harness = FlowHarness()..requireSecondFactor();
      addTearDown(harness.dispose);
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: SignInForm(
                connection: harness.connection,
                onSignedIn: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(emailKey), 'ana@example.com');
      await tester.enterText(find.byKey(passwordKey), 'secret-1');
      await tester.tap(find.text(l10n.actionSignIn));
      await tester.pumpAndSettle();

      expect(find.text(l10n.mfaMethodTotp), findsOneWidget);
      await expectAccessible(tester);
    });

    testWidgets('a picked method asks for a numeric code with Done', (
      tester,
    ) async {
      final harness = FlowHarness()
        ..requireSecondFactor()
        ..offerChallenge();
      addTearDown(harness.dispose);
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: SignInForm(
                connection: harness.connection,
                onSignedIn: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(emailKey), 'ana@example.com');
      await tester.enterText(find.byKey(passwordKey), 'secret-1');
      await tester.tap(find.text(l10n.actionSignIn));
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.mfaMethodTotp));
      await tester.pumpAndSettle();

      final field = tester.widget<TextField>(find.byKey(codeKey));
      expect(field.keyboardType, TextInputType.number);
      expect(field.textInputAction, TextInputAction.done);
      await expectAccessible(tester);
    });

    testWidgets('a wrong code keeps the code field and shows the error', (
      tester,
    ) async {
      final harness = FlowHarness()
        ..requireSecondFactor()
        ..offerChallenge();
      addTearDown(harness.dispose);
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: SignInForm(
                connection: harness.connection,
                onSignedIn: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(emailKey), 'ana@example.com');
      await tester.enterText(find.byKey(passwordKey), 'secret-1');
      await tester.tap(find.text(l10n.actionSignIn));
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.mfaMethodTotp));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(codeKey), '000000');
      await tester.tap(find.text(l10n.mfaVerify));
      await tester.pumpAndSettle();

      expect(find.byKey(errorKey), findsOneWidget);
      expect(find.byKey(codeKey), findsOneWidget);
      await expectAccessible(tester);
    });
  });
}
