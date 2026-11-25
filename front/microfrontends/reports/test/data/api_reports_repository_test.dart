import 'package:contracts/contracts.dart' as api;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/api_reports_repository.dart';
import 'package:mf_reports/src/shared/types/report_run_not_found_exception.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/report_requests.dart';

const _runId = '0193f1c2-0000-7000-8000-0000000000f1';

Map<String, Object?> _run({
  String status = 'ready',
  bool withResult = true,
}) => {
  'id': _runId,
  'type': 'tasks_by_status',
  'status': status,
  'format': 'csv',
  'params': {'from': '2026-11-01', 'to': '2026-11-07', 'granularity': 'day'},
  'requestedBy': {
    'userId': '0193f1c2-0000-7000-8000-0000000000aa',
    'homeTenantId': '0193f1c2-0000-7000-8000-0000000000bb',
  },
  'createdAt': '2026-11-07T10:00:00.000Z',
  'completedAt': null,
  'expiresAt': null,
  if (withResult)
    'result': {
      'columns': [
        {'key': 'status', 'header': 'Estado', 'kind': 'text'},
      ],
      'rows': [
        {
          'cells': ['open'],
        },
      ],
    },
};

void main() {
  late ScriptedTransport transport;
  late ApiReportsRepository repository;

  setUp(() {
    transport = ScriptedTransport();
    repository = ApiReportsRepository(client: ScriptedApi.client(transport));
  });

  test('reads the catalog', () async {
    transport.json(200, {
      'items': [
        {
          'type': 'invoices_summary',
          'formats': ['json'],
          'granularities': ['month'],
        },
      ],
    });

    final catalog = await repository.catalog();

    expect(catalog.single.type, api.ReportType.invoicesSummary);
    expect(transport.requests.single.uri.path, '/v1/reports');
  });

  test('queues a run with its parameters and returns its id', () async {
    transport.json(202, {'runId': _runId});

    final id = await repository.createRun(ReportRequests.tasksCsv);

    expect(id, _runId);
    expect(transport.requests.single.method, 'POST');
    expect(transport.bodyOf(0), {
      'type': 'tasks_by_status',
      'format': 'csv',
      'params': {
        'from': '2026-11-01',
        'to': '2026-11-07',
        'granularity': 'day',
      },
    });
  });

  test(
    'a request that breaks the contract never reaches the network',
    () async {
      await expectLater(
        repository.createRun(
          const api.CreateReportRunRequest(
            type: api.ReportType.tasksByStatus,
            format: api.ReportFormat.csv,
            params: api.ReportParams(
              from: 'yesterday',
              to: '2026-11-07',
              granularity: api.ReportGranularity.day,
            ),
          ),
        ),
        throwsA(isA<api.ContractViolationException>()),
      );
      expect(transport.requests, isEmpty);
    },
  );

  test('lists the latest page of runs', () async {
    transport.json(200, {
      'items': [
        {
          for (final MapEntry(:key, :value) in _run().entries)
            if (key != 'result') key: value,
        },
      ],
      'nextCursor': null,
    });

    final runs = await repository.runs();

    expect(runs.single.status, api.ReportRunStatus.ready);
    expect(transport.requests.single.uri.queryParameters, {'limit': '100'});
  });

  test('reads one run with its result and downloads its file', () async {
    transport
      ..json(200, _run())
      ..json(200, {
        'fileName': 'tasks_by_status.csv',
        'contentType': 'text/csv',
        'content': 'status\nopen',
      });

    final run = await repository.run(_runId);
    final file = await repository.download(_runId);

    expect(run.result?.rows.single.cells, ['open']);
    expect(file.content, 'status\nopen');
    expect(
      transport.requests.last.uri.path,
      '/v1/reports/runs/$_runId/download',
    );
  });

  test('a run the API does not find is a ReportRunNotFoundException', () async {
    transport
      ..problem(
        ProblemFixtures.withCode(
          api.ReportsErrorCode.runNotFound.code,
          status: 404,
        ),
      )
      ..problem(ProblemFixtures.unavailable());

    await expectLater(
      repository.run(_runId),
      throwsA(isA<ReportRunNotFoundException>()),
    );
    await expectLater(
      repository.download(_runId),
      throwsA(isA<api.ApiErrorException>()),
    );
  });
}
