import 'package:contracts/contracts.dart' show ReportRunDetail;
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/report_file_saver.dart';
import '../data/reports_repository.dart';
import '../shared/constants/reports_demo.dart';
import '../shared/enums/reports_enums.dart';
import '../shared/types/run_progress_of.dart';
import '../shared/types/saved_report.dart';
import 'run_polling.dart';

/// State of one run: it reads the run again while it is queued or running,
/// and downloads its file once it is ready.
final class ReportRunController extends ChangeNotifier {
  /// Controller of the run [runId]. Call [start] once.
  ReportRunController(
    this._repository, {
    required this.runId,
    required this._saver,
    Duration pollInterval = reportsPollInterval,
  }) : _loader = AsyncLoader<ReportRunDetail>(() => _repository.run(runId)) {
    _polling = RunPolling(interval: pollInterval, read: _refresh);
    _loader.addListener(notifyListeners);
    _downloads.addListener(notifyListeners);
  }

  /// Id of the run shown.
  final String runId;

  final ReportsRepository _repository;
  final ReportFileSaver _saver;
  final AsyncLoader<ReportRunDetail> _loader;
  final ActionRunner _downloads = ActionRunner();
  late final RunPolling _polling;

  /// The run, or the state of the load.
  AsyncValue<ReportRunDetail> get run => _loader.value;

  /// Whether a new read of the run is scheduled.
  bool get isPolling => _polling.isScheduled;

  /// Whether the file can be downloaded now.
  bool get canDownload =>
      _loader.value.valueOrNull?.status.progress == RunProgress.ready &&
      !_downloads.isRunning;

  /// Whether a download is running.
  bool get isDownloading => _downloads.isRunning;

  /// Loads the run. Call it again to retry after an error.
  Future<void> start() async {
    await _loader.load();
    _followPending();
  }

  /// Downloads the file of the ready run and says where it went. Skipped
  /// while the run is not ready or another download runs.
  Future<ActionResult<SavedReport>> download() async {
    if (!canDownload) return ActionSkipped<SavedReport>();
    return _downloads.run(() async {
      final file = await _repository.download(runId);
      return SavedReport(
        fileName: file.fileName,
        outcome: await _saver.save(file),
      );
    });
  }

  Future<void> _refresh() async {
    await _loader.load(keepCurrent: true);
    _followPending();
  }

  void _followPending() => _polling.follow(
    pending: _loader.value.valueOrNull?.status.progress == RunProgress.pending,
  );

  @override
  void dispose() {
    _polling.dispose();
    _downloads.dispose();
    _loader.dispose();
    super.dispose();
  }
}
