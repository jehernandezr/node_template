import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../shared/types/account_types.dart';
import 'step_up_gate.dart';

/// State and actions of the security screen. Every action asks for a step-up.
final class SecurityController extends ChangeNotifier {
  /// Controller over [repository] that asks for a step-up before sensitive changes.
  SecurityController(AccountRepository repository, {required this._stepUp})
    : _repository = repository,
      _loader = AsyncLoader(repository.loadSecurity),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final StepUpGate _stepUp;
  final AsyncLoader<SecurityOverview> _loader;
  final ActionRunner _runner;

  /// MFA and passkeys: loading, loaded or failed.
  AsyncValue<SecurityOverview> get overview => _loader.value;

  /// Whether an action is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the security summary.
  Future<void> start() => _loader.load();

  /// Registers a passkey after a step-up and reloads the summary.
  Future<ActionResult<void>> addPasskey() async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    final result = await _runner.run(_repository.addPasskey);
    if (result is ActionSucceeded<void>) {
      unawaited(_loader.load(keepCurrent: true));
    }
    return result;
  }

  /// Generates new recovery codes after a step-up and returns them.
  Future<ActionResult<List<String>>> regenerateCodes() async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    return _runner.run(_repository.regenerateRecoveryCodes);
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
