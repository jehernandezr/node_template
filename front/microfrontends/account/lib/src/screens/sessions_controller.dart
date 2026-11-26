import 'dart:async';

import 'package:contracts/contracts.dart' show SessionSummary;
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import 'step_up_gate.dart';

/// State and actions of the active sessions screen.
final class SessionsController extends ChangeNotifier {
  /// Controller over [repository] that asks for a step-up before sensitive changes.
  SessionsController(AccountRepository repository, {required this._stepUp})
    : _repository = repository,
      _loader = AsyncLoader(repository.listSessions),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final StepUpGate _stepUp;
  final AsyncLoader<List<SessionSummary>> _loader;
  final ActionRunner _runner;

  /// Active sessions: loading, loaded or failed.
  AsyncValue<List<SessionSummary>> get sessions => _loader.value;

  /// Whether a close action is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the sessions.
  Future<void> start() => _loader.load();

  /// Closes one session and reloads the list.
  Future<ActionResult<void>> closeSession(String id) async {
    final result = await _runner.run(() => _repository.revokeSession(id));
    if (result is ActionSucceeded<void>) {
      unawaited(_loader.load(keepCurrent: true));
    }
    return result;
  }

  /// Closes every other session after a step-up. Returns how many closed, or
  /// [ActionSkipped] when the user declines the step-up.
  Future<ActionResult<int>> closeOthers() async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    final result = await _runner.run(_repository.revokeOtherSessions);
    if (result is ActionSucceeded<int>) {
      unawaited(_loader.load(keepCurrent: true));
    }
    return result;
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
