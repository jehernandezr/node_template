import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_reports/mf_reports.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import 'utils/reports_test_app.dart';

void main() {
  test('manifest id matches package', () {
    expect(reportsManifest.id, const MicrofrontendId('reports'));
    expect(reportsManifest.modes, {ShellMode.demo, ShellMode.live});
  });

  test('every route lives under /reports', () {
    final paths = _absolutePaths(
      reportsManifest.buildRoutes(
        DeferredLibraryLoader().page,
        () => ReportsTestApp.newScope(),
      ),
    );
    expect(
      paths,
      containsAll(['/reports', '/reports/runs', '/reports/runs/:runId']),
    );
    for (final path in paths) {
      expect(path, startsWith('/reports'));
    }
  });

  test('declares screens and no lifecycle', () {
    expect(reportsManifest.screens, hasLength(1));
    expect(reportsManifest.hasLifecycle, isFalse);
  });

  test('requires the permission to read reports', () {
    final now = DateTime.utc(2026, 1, 1);
    expect(
      reportsManifest.access.allows(SessionBuilder().build(), now: now),
      isFalse,
    );
    expect(
      reportsManifest.access.allows(
        SessionBuilder().withPermissions([Permission.reportsRead]).build(),
        now: now,
      ),
      isTrue,
    );
  });

  test('the manifest does not import data, screens or l10n eagerly', () {
    final pending = [File('lib/mf_reports.dart')];
    final seen = <String>{};
    while (pending.isNotEmpty) {
      final file = pending.removeLast();
      if (!seen.add(file.path)) continue;
      for (final uri in _eagerImports(file.readAsStringSync())) {
        if (uri.startsWith('package:mf_reports/')) {
          pending.add(
            File('lib/${uri.substring('package:mf_reports/'.length)}'),
          );
        } else if (!uri.contains(':')) {
          pending.add(File.fromUri(file.uri.resolve(uri)));
        }
      }
    }
    expect(seen, contains('lib/mf_reports.dart'));
    for (final path in seen) {
      for (final forbidden in ['/data/', '/screens/', '/l10n/']) {
        expect(path, isNot(contains(forbidden)), reason: path);
      }
    }
  });

  test('screens are imported as deferred', () {
    final source = File('lib/mf_reports.dart').readAsStringSync();
    expect(source, contains("screens.dart' deferred as screens"));
  });
}

/// URIs of the imports and exports of [source] that are not deferred.
Iterable<String> _eagerImports(String source) sync* {
  final directive = RegExp(
    r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]([^;]*);''',
    multiLine: true,
  );
  for (final match in directive.allMatches(source)) {
    if ((match.group(2) ?? '').contains('deferred')) continue;
    yield match.group(1)!;
  }
}

/// Absolute paths of [routes] and their children. Nested paths are relative.
List<String> _absolutePaths(List<RouteBase> routes, [String parent = '']) => [
  for (final route in routes.whereType<GoRoute>()) ...[
    _join(parent, route.path),
    ..._absolutePaths(route.routes, _join(parent, route.path)),
  ],
];

String _join(String parent, String path) =>
    path.startsWith('/') ? path : '$parent/$path';
