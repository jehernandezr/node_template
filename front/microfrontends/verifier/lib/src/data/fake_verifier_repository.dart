import 'dart:async';
import 'dart:convert';

import 'package:auth/auth.dart';

import 'login_challenge.dart';
import 'verifier_repository.dart';

/// Turns a signature into an 8-digit code: the first four bytes as a big-endian
/// number, modulo 10^8, left-padded with zeros.
String codeFromSignature(List<int> signature) {
  var value = 0;
  for (final byte in signature.take(4)) {
    value = (value << 8) | (byte & 0xff);
  }
  return (value % 100000000).toString().padLeft(8, '0');
}

/// In-memory [VerifierRepository] for development and tests.
///
/// Use [push] to simulate a login attempt arriving and [deny] to resolve it.
final class FakeVerifierRepository implements VerifierRepository {
  /// Creates a repository. [initial] is the challenge pending at start.
  FakeVerifierRepository(this._deviceKey, {LoginChallenge? initial})
    : _current = initial;

  final DeviceKeyPort _deviceKey;
  final StreamController<LoginChallenge?> _changes =
      StreamController<LoginChallenge?>.broadcast();
  LoginChallenge? _current;

  /// Makes [challenge] the pending one (or clears it when null) and notifies
  /// every subscriber.
  void push(LoginChallenge? challenge) {
    _current = challenge;
    _changes.add(challenge);
  }

  @override
  Stream<LoginChallenge?> pending() {
    return Stream<LoginChallenge?>.multi((controller) {
      controller.add(_current);
      final subscription = _changes.stream.listen(
        controller.add,
        onError: controller.addError,
        onDone: controller.close,
      );
      controller.onCancel = subscription.cancel;
    });
  }

  @override
  Future<void> deny(String challengeId) async {
    if (_current?.id != challengeId) return;
    push(null);
  }

  @override
  Future<String> autoCode(String challengeId) async {
    final signature = await _deviceKey.sign(utf8.encode('login:$challengeId'));
    return codeFromSignature(signature);
  }

  @override
  void close() {
    unawaited(_changes.close());
  }
}
