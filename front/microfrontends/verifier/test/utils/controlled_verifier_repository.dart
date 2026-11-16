import 'dart:async';

import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';

/// Repository whose behavior each test controls. [source] is the stream of
/// challenges; the call counters show how often the screen asked.
final class ControlledVerifierRepository implements VerifierRepository {
  final StreamController<LoginChallenge?> source =
      StreamController<LoginChallenge?>.broadcast();
  Future<String> Function(String id) onAutoCode = (_) async => '12345678';
  Future<void> Function(String id) onDeny = (_) async {};
  int autoCodeCalls = 0;
  int denyCalls = 0;

  bool get hasListener => source.hasListener;

  @override
  Stream<LoginChallenge?> pending() => source.stream;

  @override
  Future<void> deny(String challengeId) {
    denyCalls++;
    return onDeny(challengeId);
  }

  @override
  Future<String> autoCode(String challengeId) {
    autoCodeCalls++;
    return onAutoCode(challengeId);
  }

  @override
  void dispose() {
    unawaited(source.close());
  }
}
