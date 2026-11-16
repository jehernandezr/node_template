import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_host/src/pages/step_up_form.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/flow_harness.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('es'));
  const codeKey = ValueKey('step-up-code');
  const retryKey = ValueKey('step-up-retry');

  group('StepUpForm', () {
    testWidgets('a failed start offers to retry', (tester) async {
      final harness = FlowHarness();
      addTearDown(harness.dispose);
      await harness.signIn();
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: StepUpForm(
                connection: harness.connection,
                onVerified: (_) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(retryKey), findsOneWidget);
      await expectAccessible(tester);
    });

    testWidgets('an open step-up offers its methods', (tester) async {
      final harness = FlowHarness()..offerStepUp();
      addTearDown(harness.dispose);
      await harness.signIn();
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: StepUpForm(
                connection: harness.connection,
                onVerified: (_) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(l10n.mfaMethodTotp), findsOneWidget);
      await expectAccessible(tester);
    });

    testWidgets('a picked method shows the code field', (tester) async {
      final harness = FlowHarness()
        ..offerStepUp()
        ..offerChallenge();
      addTearDown(harness.dispose);
      await harness.signIn();
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: StepUpForm(
                connection: harness.connection,
                onVerified: (_) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.mfaMethodTotp));
      await tester.pumpAndSettle();

      expect(find.byKey(codeKey), findsOneWidget);
      await expectAccessible(tester);
    });

    testWidgets('a verified code reports the new mfaVerifiedAt', (
      tester,
    ) async {
      final harness = FlowHarness()
        ..offerStepUp()
        ..offerChallenge()
        ..acceptStepUp();
      addTearDown(harness.dispose);
      await harness.signIn();
      DateTime? verified;
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: SingleChildScrollView(
              child: StepUpForm(
                connection: harness.connection,
                onVerified: (at) => verified = at,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.mfaMethodTotp));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(codeKey), FlowHarness.validCode);
      await tester.tap(find.text(l10n.mfaVerify));
      await tester.pumpAndSettle();

      expect(verified, FlowHarness.now);
      await expectAccessible(tester);
    });
  });
}
