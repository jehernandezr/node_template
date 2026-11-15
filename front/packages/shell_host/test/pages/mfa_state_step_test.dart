import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_host/src/pages/mfa_state_step.dart';

void main() {
  const pending = PendingMfa(mfaToken: 'm', methods: [MfaFactor.totp]);

  group('MfaStateStep', () {
    test('a resting step is its own step', () {
      expect(const MfaIdle().step, isA<MfaIdle>());
    });

    test('a busy state reports the step it started from', () {
      expect(const MfaBusy(MfaIdle()).step, isA<MfaIdle>());
    });

    test('a failed state reports the step it returns to', () {
      expect(
        const MfaFailed('X', MfaAwaitingMethod(pending)).step,
        isA<MfaAwaitingMethod>(),
      );
    });

    test('a step is returned as the same object', () {
      const step = MfaAwaitingMethod(pending);

      expect(step.step, same(step));
    });
  });
}
