import 'package:contracts/contracts.dart' show ReportRunSummary;
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/reports_repository.dart';
import '../shared/constants/reports_demo.dart';
import '../shared/enums/reports_enums.dart';
import '../shared/types/run_progress_of.dart';
import 'run_polling.dart';

/// State of the runs list: it reads the runs again while any of them is
/// still queued or running, keeping the list on screen in between.
final class ReportRunsController extends ChangeNotifier {
  /// Controller over [repository]. Call [start] once.
  ReportRunsController(
    ReportsRepository repository, {
    Duration pollInterval = reportsPollInterval,
  }) : _loader = AsyncLoader<List<ReportRunSummary>>(repository.runs) {
    _polling = RunPolling(interval: pollInterval, read: _refresh);
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<List<ReportRunSummary>> _loader;
  late final RunPolling _polling;

  /// The runs, newest first, or the state of the load.
  AsyncValue<List<ReportRunSummary>> get runs => _loader.value;

  /// Whether a new read of the runs is scheduled.
  bool get isPolling => _polling.isScheduled;

  /// Loads the runs. Call it again to retry after an error.
  Future<void> start() async {
    await _loader.load();
    _followPending();
  }

  Future<void> _refresh() async {
    await _loader.load(keepCurrent: true);
    _followPending();
  }

  void _followPending() => _polling.follow(
    pending:
        _loader.value.valueOrNull?.any(
          (run) => run.status.progress == RunProgress.pending,
        ) ??
        false,
  );

  @override
  void dispose() {
    _polling.dispose();
    _loader.dispose();
    super.dispose();
  }
}
