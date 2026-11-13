import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

final _import = RegExp(
  r'''^import\s+['"]([^'"]+)['"]([^;]*);''',
  multiLine: true,
);

/// Imports of [file] that are not deferred, resolved to files of this package.
List<File> _eagerImports(File file) {
  final result = <File>[];
  for (final match in _import.allMatches(file.readAsStringSync())) {
    final uri = match.group(1)!;
    final isDeferred = (match.group(2) ?? '').contains('deferred');
    if (isDeferred) continue;
    if (uri.startsWith('package:mf_account/')) {
      result.add(File('lib/${uri.substring('package:mf_account/'.length)}'));
    } else if (!uri.contains(':')) {
      result.add(File.fromUri(file.uri.resolve(uri)));
    }
  }
  return result;
}

void main() {
  const forbidden = ['/src/data/', '/src/screens/', '/src/l10n/'];

  test('the manifest reaches no data, screens or l10n without deferred', () {
    final root = File('lib/mf_account.dart');
    final seen = <String>{};
    final pending = [root];
    while (pending.isNotEmpty) {
      final file = pending.removeLast();
      final path = file.absolute.path;
      if (!seen.add(path)) continue;
      expect(file.existsSync(), isTrue, reason: path);
      for (final bad in forbidden) {
        expect(path, isNot(contains(bad)), reason: 'eager import of $path');
      }
      pending.addAll(_eagerImports(file));
    }
    // The manifest reaches the shared layer, so the walk is not empty.
    expect(seen.any((path) => path.contains('/src/shared/')), isTrue);
  });

  test('the screens library is imported deferred', () {
    final source = File('lib/mf_account.dart').readAsStringSync();
    expect(
      source,
      contains("import 'src/screens/screens.dart' deferred as screens;"),
    );
  });

  test('shared layers follow the dependency rules', () {
    // enums import nothing; constants only enums; types enums and constants;
    // utils all of them.
    const allowed = {
      'enums': <String>{},
      'constants': {'enums'},
      'types': {'enums', 'constants'},
      'utils': {'enums', 'constants', 'types'},
    };
    for (final entry in allowed.entries) {
      final dir = Directory('lib/src/shared/${entry.key}');
      for (final file in dir.listSync().whereType<File>()) {
        for (final target in _eagerImports(file)) {
          final path = target.path;
          if (!path.contains('shared/')) {
            fail('${file.path} imports $path outside shared');
          }
          final layer = path.split('shared/')[1].split('/').first;
          expect(
            entry.value.contains(layer) || layer == entry.key,
            isTrue,
            reason: '${file.path} imports $layer',
          );
        }
      }
    }
  });
}
