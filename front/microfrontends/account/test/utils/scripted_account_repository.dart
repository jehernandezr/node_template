import 'dart:async';

import 'package:contracts/contracts.dart' show SessionSummary;
import 'package:mf_account/src/data/fake_account_repository.dart';

/// Repository whose session listings finish when the test completes them, so
/// a test can answer calls out of order.
final class ScriptedAccountRepository extends FakeAccountRepository {
  /// One completer per call to [listSessions], in call order.
  final List<Completer<List<SessionSummary>>> listings = [];

  @override
  Future<List<SessionSummary>> listSessions() {
    final completer = Completer<List<SessionSummary>>();
    listings.add(completer);
    return completer.future;
  }
}
