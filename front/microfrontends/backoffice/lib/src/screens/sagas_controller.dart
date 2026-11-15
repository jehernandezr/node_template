import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';

/// State of the saga list: the status filter and the result.
final class SagasController extends ChangeNotifier {
  /// Creates the controller over [repository]. Nothing loads until [start].
  SagasController(this._repository) {
    _loader = AsyncLoader<List<Saga>>(_fetch);
    _loader.addListener(notifyListeners);
  }

  final BackofficeRepository _repository;
  late final AsyncLoader<List<Saga>> _loader;
  SagaStatus? _status;

  /// Selected status, or null for all.
  SagaStatus? get status => _status;

  /// Sagas with the selected status, most recently updated first.
  AsyncValue<List<Saga>> get sagas => _loader.value;

  /// Loads the list with the current filter; also the retry.
  Future<void> start() => _loader.load();

  /// Sets the status filter and reloads.
  Future<void> filterByStatus(SagaStatus? status) {
    _status = status;
    return _loader.load();
  }

  Future<List<Saga>> _fetch() => _repository.listSagas(status: _status);

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
