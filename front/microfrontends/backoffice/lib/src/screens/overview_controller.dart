import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/types/backoffice_types.dart';

/// State of the overview: the counts of the platform.
final class OverviewController extends ChangeNotifier {
  /// Creates the controller over [repository]. Nothing loads until [start].
  OverviewController(BackofficeRepository repository)
    : _loader = AsyncLoader<BackofficeOverview>(repository.overview) {
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<BackofficeOverview> _loader;

  /// Counts, loading or failed.
  AsyncValue<BackofficeOverview> get overview => _loader.value;

  /// Loads the counts; also the retry of the error view.
  Future<void> start() => _loader.load();

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
