import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/api_reports_repository.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/data/reports_data.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  test('a demo scope keeps one fake and releases it on dispose', () async {
    final scope = TestScope().scope;
    final repository = scope.repository(ReportsData.repository);

    expect(
      identical(repository, scope.repository(ReportsData.repository)),
      isTrue,
    );
    await scope.dispose();

    expect((repository as FakeReportsRepository).isDisposed, isTrue);
  });

  test('a live scope reads the catalog from the API', () async {
    final transport = ScriptedTransport()..json(200, {'items': <Object>[]});
    final scope = ScriptedApi.liveScope(transport);
    addTearDown(scope.dispose);

    final repository = scope.repository(ReportsData.repository);
    final catalog = await repository.catalog();

    expect(repository, isA<ApiReportsRepository>());
    expect(catalog, isEmpty);
  });
}
