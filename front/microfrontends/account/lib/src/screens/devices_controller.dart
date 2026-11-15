import 'dart:async';

import 'package:contracts/contracts.dart' show DeviceSummary;
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../shared/enums/account_enums.dart';
import 'step_up_gate.dart';

/// State and actions of the trusted devices screen.
final class DevicesController extends ChangeNotifier {
  DevicesController(AccountRepository repository, {required this._stepUp})
    : _repository = repository,
      _loader = AsyncLoader(repository.listDevices),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final StepUpGate _stepUp;
  final AsyncLoader<List<DeviceSummary>> _loader;
  final ActionRunner _runner;

  /// Trusted devices: loading, loaded or failed.
  AsyncValue<List<DeviceSummary>> get devices => _loader.value;

  /// Whether a removal is running.
  bool get isBusy => _runner.isRunning;

  /// Whether the repository can withdraw the trust of a device.
  bool get canRemoveTrust =>
      _repository.capabilities.contains(AccountCapability.deviceTrust);

  /// Loads the devices.
  Future<void> start() => _loader.load();

  /// Withdraws the trust of device [id] after a step-up and reloads the list.
  /// [ActionSkipped] when the user declines the step-up.
  Future<ActionResult<void>> removeTrust(String id) async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    final result = await _runner.run(() => _repository.removeDeviceTrust(id));
    if (result is ActionSucceeded<void>) {
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
