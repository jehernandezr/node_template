import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../shared/types/account_types.dart';

/// State and actions of the agreements screen.
final class AgreementsController extends ChangeNotifier {
  /// Controller over [repository]; call `start` once.
  AgreementsController(AccountRepository repository)
    : _repository = repository,
      _loader = AsyncLoader(() => _fetch(repository)),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final AsyncLoader<AgreementsOverview> _loader;
  final ActionRunner _runner;

  /// Pending and accepted agreements: loading, loaded or failed.
  AsyncValue<AgreementsOverview> get agreements => _loader.value;

  /// Whether an acceptance is running.
  bool get isBusy => _runner.isRunning;

  /// Loads both lists.
  Future<void> start() => _loader.load();

  /// Accepts agreement [id] and reloads both lists.
  Future<ActionResult<void>> accept(String id) async {
    final result = await _runner.run(() => _repository.acceptAgreement(id));
    if (result is ActionSucceeded<void>) {
      unawaited(_loader.load(keepCurrent: true));
    }
    return result;
  }

  /// Future.wait rethrows the original exception, which the loader turns into an error state; a record `.wait` would wrap it in an Error.
  static Future<AgreementsOverview> _fetch(AccountRepository repository) async {
    final [pending, accepted] = await Future.wait([
      repository.listPendingAgreements(),
      repository.listAcceptedAgreements(),
    ]);
    return AgreementsOverview(pending: pending, accepted: accepted);
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
