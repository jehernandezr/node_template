import 'package:api/api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/account_data.dart';
import 'package:mf_account/src/data/api_account_repository.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/test_app.dart';

void main() {
  group(AccountData, () {
    test('demo mode serves one shared fake per scope', () {
      final scope = testScope();
      addTearDown(scope.dispose);

      final repository = scope.repository(AccountData.repository);

      expect(repository, isA<FakeAccountRepository>());
      expect(
        identical(repository, scope.repository(AccountData.repository)),
        isTrue,
      );
    });

    test('disposing the scope releases the demo repository', () async {
      final scope = testScope();
      final repository =
          scope.repository(AccountData.repository) as FakeAccountRepository;

      await scope.dispose();

      expect(repository.isDisposed, isTrue);
    });

    test('live mode talks to the API without security', () {
      final scope = liveScope(
        ApiClient(
          transport: ScriptedTransport(),
          baseUri: Uri.parse('https://api.example.com'),
          accessToken: () async => 'token',
        ),
      );
      addTearDown(scope.dispose);

      final repository = scope.repository(AccountData.repository);

      expect(repository, isA<ApiAccountRepository>());
      expect(
        repository.capabilities,
        isNot(contains(AccountCapability.security)),
      );
    });
  });
}
