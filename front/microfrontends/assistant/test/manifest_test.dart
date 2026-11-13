import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_assistant/mf_assistant.dart';
import 'package:shell_core/shell_core.dart';

import 'support.dart';

final _import = RegExp(
  r'''^import\s+['"]([^'"]+)['"]([^;]*);''',
  multiLine: true,
);

/// Non-deferred relative imports of [file], resolved to files.
List<File> _eagerImports(File file) => [
  for (final match in _import.allMatches(file.readAsStringSync()))
    if (!match.group(1)!.startsWith('package:') &&
        !match.group(1)!.startsWith('dart:') &&
        !match.group(2)!.contains('deferred'))
      File.fromUri(file.uri.resolve(match.group(1)!)),
];

void main() {
  test('manifest id, menu and plan access', () {
    expect(assistantManifest.id, MicrofrontendId.assistant);
    expect(assistantManifest.menu.single.path, '/assistant');
    expect(assistantManifest.hasLifecycle, isFalse);
    expect(assistantManifest.access.allows(UserSession.anonymous()), isFalse);
    expect(assistantManifest.access.allows(readerSession()), isTrue);
  });

  test('manifest declares the list and the nested chat screen', () {
    final list = assistantManifest.screens.single;
    expect(list.path, '/assistant');
    expect(list.routes.single.path, ':conversationId');
    final routes = assistantManifest.buildRoutes(loadNow, () => newScope());
    final root = routes.single as GoRoute;
    expect(root.path, '/assistant');
    expect((root.routes.single as GoRoute).path, ':conversationId');
  });

  test('routes inherit the manifest access rule', () {
    final noPlan = UserSession(userId: 'u', tenantId: 't');
    expect(assistantManifest.access.allows(noPlan), isFalse);
    expect(assistantManifest.screens.single.access, isNull);
  });

  test('manifest does not import data, screens or l10n eagerly', () {
    final manifest = File('lib/mf_assistant.dart');
    expect(
      manifest.readAsStringSync(),
      contains("assistant_screens.dart' deferred as screens"),
    );

    final seen = <String>{};
    final pending = [manifest];
    while (pending.isNotEmpty) {
      final file = pending.removeLast();
      if (!seen.add(file.path)) continue;
      pending.addAll(_eagerImports(file));
    }
    final forbidden = seen.where(
      (path) =>
          path.contains('/data/') ||
          path.contains('/screens/') ||
          path.contains('/l10n/'),
    );
    expect(forbidden, isEmpty);
  });
}
