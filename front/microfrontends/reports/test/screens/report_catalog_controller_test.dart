import 'package:contracts/contracts.dart'
    show ReportFormat, ReportGranularity, ReportType;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/screens/report_catalog_controller.dart';
import 'package:mf_reports/src/shared/enums/reports_enums.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

void main() {
  late FakeReportsRepository repository;
  late ReportCatalogController controller;

  setUp(() async {
    repository = FakeReportsRepository(seed: const []);
    controller = ReportCatalogController(
      repository,
      clock: () => DateTime(2026, 11, 24, 15),
    );
    await controller.start();
  });

  tearDown(() => controller.dispose());

  test('loads the catalog with nothing prepared', () {
    expect(controller.catalog.valueOrNull, hasLength(ReportType.values.length));
    expect(controller.draft, isNull);
  });

  test('prepares a report and keeps its parameters when chosen again', () {
    controller
      ..choose(ReportType.invoicesSummary)
      ..chooseFormat(ReportFormat.csv)
      ..choose(ReportType.invoicesSummary);

    expect(controller.draft?.entry.type, ReportType.invoicesSummary);
    expect(controller.draft?.format, ReportFormat.csv);
  });

  test('changing parameters without a report prepared does nothing', () {
    controller
      ..chooseFormat(ReportFormat.csv)
      ..choosePeriod(ReportPeriod.last7Days);

    expect(controller.draft, isNull);
  });

  test('queues a run with the chosen parameters ending today', () async {
    controller
      ..choose(ReportType.tasksByStatus)
      ..chooseGranularity(ReportGranularity.month)
      ..choosePeriod(ReportPeriod.last7Days);

    final result = await controller.generate();
    final runId = (result as ActionSucceeded<String>).value;
    final run = await repository.run(runId);

    expect(run.type, ReportType.tasksByStatus);
    expect(run.params.granularity, ReportGranularity.month);
    expect(run.params.from, '2026-11-18');
    expect(run.params.to, '2026-11-24');
    expect(controller.isGenerating, isFalse);
  });

  test('generating without a report prepared is skipped', () async {
    expect(await controller.generate(), isA<ActionSkipped<String>>());
  });

  test('a failed run request comes back as ActionFailed', () async {
    final failing = ReportCatalogController(
      FakeReportsRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: ReportsOperation.createRun,
          ),
      ),
    );
    addTearDown(failing.dispose);
    await failing.start();
    failing.choose(ReportType.tasksActivity);

    expect(await failing.generate(), isA<ActionFailed<String>>());
  });

  test('a failed catalog can be loaded again', () async {
    final failing = ReportCatalogController(
      FakeReportsRepository(
        behavior: DemoBehavior()
          ..failNext(const FakeFailure(), operation: ReportsOperation.catalog),
      ),
    );
    addTearDown(failing.dispose);

    await failing.start();
    final failed = failing.catalog;
    await failing.start();

    expect(failed, isA<AsyncError<Object>>());
    expect(failing.catalog.valueOrNull, isNotEmpty);
  });
}
