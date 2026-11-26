import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';

/// State of the saga detail: the saga, its audit log and the manual actions.
final class SagaDetailController extends ChangeNotifier {
  /// Creates the controller for the saga [sagaId]. Nothing loads until
  /// [start].
  SagaDetailController(this._repository, {required this._sagaId}) {
    _loader = AsyncLoader<SagaWithAudit>(_fetch);
    _runner = ActionRunner();
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final BackofficeRepository _repository;
  final String _sagaId;
  late final AsyncLoader<SagaWithAudit> _loader;
  late final ActionRunner _runner;

  /// The saga (null inside when it does not exist) and its audit log.
  AsyncValue<SagaWithAudit> get detail => _loader.value;

  /// Whether a manual action is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the saga and its audit log in parallel; also the retry.
  Future<void> start() => _loader.load();

  /// Applies [action] with [reason] and, on success, reloads keeping the data
  /// on screen. Returns what the action gave.
  Future<ActionResult<void>> apply(
    SagaManualAction action,
    String reason,
  ) async {
    final result = await _runner.run(
      () => _repository.applySagaAction(
        sagaId: _sagaId,
        action: action,
        reason: reason,
      ),
    );
    if (result is ActionSucceeded<void>) {
      await _loader.load(keepCurrent: true);
    }
    return result;
  }

  /// Both calls start before either is awaited, so they run in parallel.
  Future<SagaWithAudit> _fetch() async {
    final saga = _repository.saga(_sagaId);
    final audit = _repository.sagaAudit(_sagaId);
    await Future.wait<Object?>([saga, audit]);
    return SagaWithAudit(saga: await saga, audit: await audit);
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
