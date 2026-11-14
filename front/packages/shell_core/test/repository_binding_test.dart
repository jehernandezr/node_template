import 'package:api/api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/idle_transport.dart';

final class _FakeRepo implements ScopedResource {
  _FakeRepo(this.origin);

  final String origin;
  bool disposed = false;

  @override
  void dispose() => disposed = true;
}

MicrofrontendScope _demoScope() => MicrofrontendScope(
  ShellServices(session: UserSession.anonymous(), mode: ShellMode.demo),
);

MicrofrontendScope _liveScope() => MicrofrontendScope(
  ShellServices(
    session: UserSession.anonymous(),
    mode: ShellMode.live,
    api: ApiClient(
      transport: IdleTransport(),
      baseUri: Uri.parse('https://api.test'),
    ),
  ),
);

void main() {
  group(RepositoryBinding, () {
    test('demo mode uses the demo factory and live mode the live one', () {
      final binding = RepositoryBinding<_FakeRepo>(
        demo: (_) => _FakeRepo('demo'),
        live: (_) => _FakeRepo('live'),
      );

      expect(_demoScope().repository(binding).origin, 'demo');
      expect(_liveScope().repository(binding).origin, 'live');
    });

    test('the instance is unique per scope', () {
      var created = 0;
      final binding = RepositoryBinding<_FakeRepo>(
        demo: (_) {
          created++;
          return _FakeRepo('demo');
        },
        live: (_) => _FakeRepo('live'),
      );

      final scope = _demoScope();
      final first = scope.repository(binding);
      final second = scope.repository(binding);

      expect(identical(first, second), isTrue);
      expect(created, 1);
      expect(identical(_demoScope().repository(binding), first), isFalse);
    });

    test('the scope disposes the repository', () async {
      final binding = RepositoryBinding<_FakeRepo>(
        demo: (_) => _FakeRepo('demo'),
        live: (_) => _FakeRepo('live'),
      );
      final scope = _demoScope();
      final repo = scope.repository(binding);

      await scope.dispose();

      expect(repo.disposed, isTrue);
    });

    test('demoOnly in live mode throws StateError', () {
      final binding = RepositoryBinding<_FakeRepo>.demoOnly(
        demo: (_) => _FakeRepo('demo'),
      );

      expect(() => _liveScope().repository(binding), throwsStateError);
      expect(_demoScope().repository(binding).origin, 'demo');
    });
  });
}
