import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/screens/step_up_gate.dart';
import 'package:mf_account/src/shared/constants/account_access.dart';
import 'package:mf_account/src/shared/constants/account_constants.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/recording_step_up.dart';
import '../utils/test_app.dart';

void main() {
  group(StepUpGate, () {
    StepUpGate gateFor(
      RecordingStepUp stepUp,
      FakeClock clock, {
      required bool mfaFresh,
    }) => StepUpGate(
      rule: accountStepUpRule,
      session: ValueNotifier(testSession(mfaFresh: mfaFresh, clock: clock)),
      clock: clock.now,
      request: stepUp.call,
    );

    test('a fresh second factor passes without asking', () async {
      final clock = FakeClock();
      final stepUp = RecordingStepUp();

      final allowed = await gateFor(stepUp, clock, mfaFresh: true).ensure();

      expect(allowed, isTrue);
      expect(stepUp.calls, 0);
    });

    test('without a second factor it asks the shell', () async {
      final clock = FakeClock();
      final stepUp = RecordingStepUp();

      final allowed = await gateFor(stepUp, clock, mfaFresh: false).ensure();

      expect(allowed, isTrue);
      expect(stepUp.calls, 1);
    });

    test('a declined step-up keeps the action blocked', () async {
      final clock = FakeClock();
      final stepUp = RecordingStepUp(answer: false);

      final allowed = await gateFor(stepUp, clock, mfaFresh: false).ensure();

      expect(allowed, isFalse);
    });

    test('an expired second factor asks the shell again', () async {
      final clock = FakeClock();
      final stepUp = RecordingStepUp();
      final gate = gateFor(stepUp, clock, mfaFresh: true);

      clock.advance(accountStepUpMaxAge + const Duration(minutes: 1));
      await gate.ensure();

      expect(stepUp.calls, 1);
    });

    testWidgets('fromContext reads the session of the shell scope', (
      tester,
    ) async {
      final clock = FakeClock();
      late BuildContext captured;
      await tester.pumpWidget(
        testApp(
          Builder(
            builder: (context) {
              captured = context;
              return const SizedBox();
            },
          ),
          session: testSession(mfaFresh: true, clock: clock),
          clock: clock,
        ),
      );
      final stepUp = RecordingStepUp();

      final gate = StepUpGate.fromContext(
        captured,
        rule: accountStepUpRule,
        request: stepUp.call,
      );

      expect(await gate.ensure(), isTrue);
      expect(stepUp.calls, 0);
    });

    testWidgets('fromContext without a shell scope is a state error', (
      tester,
    ) async {
      late BuildContext captured;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              captured = context;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(
        () => StepUpGate.fromContext(
          captured,
          rule: accountStepUpRule,
          request: approveStepUp,
        ),
        throwsStateError,
      );
    });
  });
}
