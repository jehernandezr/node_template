import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/assistant_data.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(AssistantData, () {
    test('a scope builds the demo fake and reuses it', () async {
      final testScope = TestScope();
      addTearDown(testScope.scope.dispose);

      final repo = testScope.scope.repository(AssistantData.repository);

      expect(repo, isA<FakeAssistantRepository>());
      expect(
        identical(testScope.scope.repository(AssistantData.repository), repo),
        isTrue,
      );
    });

    test('two scopes get different instances', () async {
      final first = TestScope();
      final second = TestScope();
      addTearDown(first.scope.dispose);
      addTearDown(second.scope.dispose);

      final repoA = first.scope.repository(AssistantData.repository);
      final repoB = second.scope.repository(AssistantData.repository);

      expect(identical(repoA, repoB), isFalse);
    });

    test('disposing the scope disposes the repository', () async {
      final testScope = TestScope();
      final repo = testScope.scope.repository(AssistantData.repository);

      await testScope.scope.dispose();

      expect(await repo.ask('c1', 'Hola').toList(), isEmpty);
    });

    test('the assistant binding has no live factory', () {
      expect(AssistantData.repository.live, isNull);
    });
  });
}
