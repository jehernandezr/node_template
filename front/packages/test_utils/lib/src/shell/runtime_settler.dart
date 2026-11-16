import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

/// Waits for a shell runtime to finish its queued work inside a widget test.
///
/// A lifecycle that closes on a session change needs two clocks: the fake one
/// that only `pump` moves, and the real event loop that finishes the
/// deferred libraries it loaded. Pumping alone or waiting real time alone
/// leaves the runtime busy, so each round does both.
final class RuntimeSettler {
  /// Creates the settler. It gives up after [rounds] rounds.
  const RuntimeSettler({this.rounds = 100});

  /// Most rounds of real wait plus pump before giving up.
  final int rounds;

  /// Completes when [whenIdle] does and returns whether it did. It returns
  /// false when the runtime was still busy after [rounds] rounds.
  Future<bool> settle(
    WidgetTester tester,
    Future<void> Function() whenIdle,
  ) async {
    var idle = false;
    unawaited(whenIdle().then((_) => idle = true));
    for (var i = 0; i < rounds && !idle; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump(const Duration(milliseconds: 100));
    }
    return idle;
  }
}
