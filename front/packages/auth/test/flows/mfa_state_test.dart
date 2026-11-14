import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

const _pending = PendingMfa(mfaToken: 'mfa-1', methods: [MfaFactor.totp]);

final _challenge = MfaChallenge(
  challengeId: '0193f1c2-0000-7000-8000-0000000000e1',
  method: MfaFactor.totp,
  expiresAt: DateTime.utc(2026, 11, 13, 12, 5),
);

void main() {
  test('idle has no pending second factor, challenge or error', () {
    const state = MfaIdle();

    expect(state.pending, isNull);
    expect(state.challenge, isNull);
    expect(state.errorCode, isNull);
    expect(state.isBusy, isFalse);
  });

  test('awaiting method exposes the pending second factor only', () {
    const state = MfaAwaitingMethod(_pending);

    expect(state.pending, _pending);
    expect(state.challenge, isNull);
    expect(state.isBusy, isFalse);
  });

  test('awaiting code exposes the pending second factor and the challenge', () {
    final state = MfaAwaitingCode(_pending, _challenge);

    expect(state.pending, _pending);
    expect(state.challenge, _challenge);
  });

  test('busy inherits the data of the step it left', () {
    final state = MfaBusy(MfaAwaitingCode(_pending, _challenge));

    expect(state.isBusy, isTrue);
    expect(state.pending, _pending);
    expect(state.challenge, _challenge);
    expect(state.errorCode, isNull);
  });

  test('failed keeps the code and inherits the step it returns to', () {
    final state = MfaFailed(
      IdentityErrorCode.mfaCodeExpired.code,
      const MfaAwaitingMethod(_pending),
    );

    expect(state.errorCode, IdentityErrorCode.mfaCodeExpired.code);
    expect(state.isBusy, isFalse);
    expect(state.pending, _pending);
    expect(state.challenge, isNull);
  });

  test('every state has a name, checked by an exhaustive switch', () {
    String nameOf(MfaState state) => switch (state) {
      MfaIdle() => 'idle',
      MfaAwaitingMethod() => 'awaitingMethod',
      MfaAwaitingCode() => 'awaitingCode',
      MfaBusy() => 'busy',
      MfaFailed() => 'failed',
    };

    final names = [
      nameOf(const MfaIdle()),
      nameOf(const MfaAwaitingMethod(_pending)),
      nameOf(MfaAwaitingCode(_pending, _challenge)),
      nameOf(const MfaBusy(MfaIdle())),
      nameOf(const MfaFailed('X.Y.Z', MfaIdle())),
    ];

    expect(names, ['idle', 'awaitingMethod', 'awaitingCode', 'busy', 'failed']);
  });
}
