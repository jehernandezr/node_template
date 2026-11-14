import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(TestScope, () {
    test('builds a demo scope for the default user', () {
      final testScope = TestScope();
      addTearDown(testScope.scope.dispose);

      expect(testScope.scope.services.mode, ShellMode.demo);
      expect(testScope.scope.services.session.userId, 'user-1');
    });

    test('gives the scope the user it was created for', () {
      final testScope = TestScope(userId: 'u9');
      addTearDown(testScope.scope.dispose);

      expect(testScope.scope.services.session.userId, 'u9');
    });

    test('returns the repository registered for its type', () {
      final fake = _Fake();
      final testScope = TestScope().withRepository<_Repo>(fake);
      addTearDown(testScope.scope.dispose);

      expect(testScope.scope.get<_Repo>((_) => _Other()), same(fake));
    });

    test('refuses to build a live scope', () {
      expect(() => TestScope(mode: ShellMode.live), throwsArgumentError);
    });
  });
}

abstract interface class _Repo {}

final class _Fake implements _Repo {}

final class _Other implements _Repo {}
