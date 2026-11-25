import 'package:contracts/contracts.dart'
    show ReportCatalogEntry, ReportFormat, ReportGranularity, ReportType;
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/reports_repository.dart';
import '../shared/enums/reports_enums.dart';
import '../shared/types/report_draft.dart';

/// State of the catalog: the reports the tenant can generate, the one being
/// prepared with its parameters, and the run it queues.
final class ReportCatalogController extends ChangeNotifier {
  /// Controller over [repository]; [clock] gives the day the ranges end on.
  /// Call [start] once.
  ReportCatalogController(this._repository, {this._clock = systemClock})
    : _loader = AsyncLoader<List<ReportCatalogEntry>>(_repository.catalog) {
    _loader.addListener(notifyListeners);
    _generation.addListener(notifyListeners);
  }

  final ReportsRepository _repository;
  final Clock _clock;
  final AsyncLoader<List<ReportCatalogEntry>> _loader;
  final ActionRunner _generation = ActionRunner();
  ReportDraft? _draft;

  /// The catalog, or the state of the load.
  AsyncValue<List<ReportCatalogEntry>> get catalog => _loader.value;

  /// The report being prepared, or null when none is chosen.
  ReportDraft? get draft => _draft;

  /// Whether a run is being queued.
  bool get isGenerating => _generation.isRunning;

  /// Loads the catalog. Call it again to retry after an error.
  Future<void> start() => _loader.load();

  /// Prepares the report [type] with its default parameters. Choosing the
  /// one already prepared keeps its parameters.
  void choose(ReportType type) {
    if (_draft?.entry.type == type) return;
    final entry = _loader.value.valueOrNull
        ?.where((candidate) => candidate.type == type)
        .firstOrNull;
    if (entry == null) return;
    _update(ReportDraft.of(entry));
  }

  /// Uses [format], when the prepared report offers it.
  void chooseFormat(ReportFormat format) {
    final draft = _draft;
    if (draft == null || !draft.entry.formats.contains(format)) return;
    _update(draft.copyWith(format: format));
  }

  /// Groups by [granularity], when the prepared report offers it.
  void chooseGranularity(ReportGranularity granularity) {
    final draft = _draft;
    if (draft == null || !draft.entry.granularities.contains(granularity)) {
      return;
    }
    _update(draft.copyWith(granularity: granularity));
  }

  /// Covers [period], ending today.
  void choosePeriod(ReportPeriod period) {
    final draft = _draft;
    if (draft == null) return;
    _update(draft.copyWith(period: period));
  }

  /// Queues a run of the prepared report and returns its id. Skipped when
  /// nothing is prepared or a run is already being queued.
  Future<ActionResult<String>> generate() async {
    final draft = _draft;
    if (draft == null || isGenerating) return ActionSkipped<String>();
    return _generation.run(
      () => _repository.createRun(draft.request(_clock())),
    );
  }

  void _update(ReportDraft draft) {
    _draft = draft;
    notifyListeners();
  }

  @override
  void dispose() {
    _generation.dispose();
    _loader.dispose();
    super.dispose();
  }
}
