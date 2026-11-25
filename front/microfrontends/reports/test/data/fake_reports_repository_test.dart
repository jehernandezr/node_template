import 'package:contracts/contracts.dart'
    show ReportFormat, ReportRunStatus, ReportType;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:mf_reports/src/shared/types/report_run_not_found_exception.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/report_requests.dart';

void main() {
  test('offers every report of the contract', () async {
    final catalog = await FakeReportsRepository().catalog();

    expect(catalog.map((entry) => entry.type), ReportType.values);
  });

  test('a queued run moves one step on every read until it is ready', () async {
    final repository = FakeReportsRepository(seed: const []);
    final id = await repository.createRun(ReportRequests.tasksCsv);

    final statuses = [
      for (var read = 0; read < 3; read++) (await repository.run(id)).status,
    ];

    expect(statuses, [
      ReportRunStatus.running,
      ReportRunStatus.ready,
      ReportRunStatus.ready,
    ]);
    expect((await repository.run(id)).result?.rows, isNotEmpty);
  });

  test('lists the newest run first', () async {
    final repository = FakeReportsRepository();
    final id = await repository.createRun(ReportRequests.tasksCsv);

    final runs = await repository.runs();

    expect(runs.first.id, id);
    expect(runs, hasLength(FakeReportsRepository.demoRuns.length + 1));
  });

  test('downloads the rows of a ready run in its format', () async {
    final repository = FakeReportsRepository();
    final ready = FakeReportsRepository.demoRuns.first;

    final file = await repository.download(ready.id);

    expect(ready.format, ReportFormat.csv);
    expect(file.fileName, 'tasks_by_status.csv');
    expect(file.content.split('\n').first, 'period,status,count');
  });

  test('an unknown run is a ReportRunNotFoundException', () async {
    final repository = FakeReportsRepository();

    await expectLater(
      repository.run('missing'),
      throwsA(isA<ReportRunNotFoundException>()),
    );
  });

  test('a programmed failure hits only its operation', () async {
    final repository = FakeReportsRepository(
      behavior: DemoBehavior()
        ..failNext(const FakeFailure(), operation: ReportsOperation.runs),
    );

    await expectLater(repository.runs(), throwsA(isA<FakeFailure>()));
    expect(await repository.catalog(), isNotEmpty);
  });
}
