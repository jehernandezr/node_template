import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// One `import` directive of a Dart file.
typedef _Import = ({String uri, bool deferred});

final _importPattern = RegExp(
  r'''^import\s+'([^']+)'(\s+deferred\s+as\s+\w+)?[^;]*;''',
  multiLine: true,
);

List<_Import> _imports(File file) => [
  for (final m in _importPattern.allMatches(file.readAsStringSync()))
    (uri: m.group(1)!, deferred: m.group(2) != null),
];

/// The file of this package that [uri] (imported from [from]) points to, or
/// null for other packages and `dart:` libraries.
File? _resolve(File from, String uri) {
  if (uri.startsWith('package:mf_backoffice/')) {
    return File('lib/${uri.substring('package:mf_backoffice/'.length)}');
  }
  if (uri.contains(':')) return null;
  return File.fromUri(from.absolute.uri.resolve(uri));
}

/// Path of [file] relative to `lib/`.
String _libPath(File file) {
  final lib = Directory('lib').absolute.uri.path;
  return file.absolute.uri.normalizePath().path.substring(lib.length);
}

/// Files of this package reachable from [entry] through non-deferred imports,
/// and the package imports found on the way.
({Set<String> files, Set<String> packages, Set<String> deferred}) _eagerGraph(
  File entry,
) {
  final files = <String>{};
  final packages = <String>{};
  final deferred = <String>{};
  final pending = [entry];
  while (pending.isNotEmpty) {
    final file = pending.removeLast();
    if (!files.add(_libPath(file))) continue;
    for (final import in _imports(file)) {
      final target = _resolve(file, import.uri);
      if (import.deferred) {
        deferred.add(target == null ? import.uri : _libPath(target));
      } else if (target == null) {
        packages.add(import.uri);
      } else {
        pending.add(target);
      }
    }
  }
  return (files: files, packages: packages, deferred: deferred);
}

/// Shared folders and the shared folders each one may import (ADR 0015).
const _sharedRules = {
  'enums': <String>{},
  'constants': {'enums'},
  'types': {'enums', 'constants'},
  'utils': {'enums', 'constants', 'types'},
};

void main() {
  final graph = _eagerGraph(File('lib/mf_backoffice.dart'));

  test('the manifest reaches no data, screens or l10n code eagerly', () {
    final forbidden = RegExp(r'^src/(data|screens|l10n)/');
    expect(graph.files.where(forbidden.hasMatch), isEmpty);
    expect(graph.files, contains('mf_backoffice.dart'));
  });

  test('the eager graph only adds shared constants, shell_core and the '
      'contract constants', () {
    expect(
      graph.files,
      unorderedEquals([
        'mf_backoffice.dart',
        'src/shared/constants/backoffice_access.dart',
        'src/shared/constants/backoffice_paths.dart',
      ]),
    );
    expect(graph.packages, {
      'package:contracts/contracts.dart',
      'package:shell_core/shell_core.dart',
    });
  });

  test('the screens library is the only deferred import', () {
    expect(graph.deferred, {'src/screens/screens.dart'});
  });

  test('shared folders follow the dependency rules of ADR 0015', () {
    final shared = Directory('lib/src/shared');
    final violations = <String>[];
    for (final file in shared.listSync(recursive: true).whereType<File>()) {
      if (!file.path.endsWith('.dart')) continue;
      final folder = _libPath(file).split('/')[2];
      final allowed = {folder, ..._sharedRules[folder]!};
      for (final import in _imports(file)) {
        final target = _resolve(file, import.uri);
        if (target == null) continue;
        final path = _libPath(target);
        final parts = path.split('/');
        final ok =
            parts.length > 3 &&
            parts[1] == 'shared' &&
            allowed.contains(parts[2]);
        if (!ok) violations.add('${_libPath(file)} -> $path');
      }
    }
    expect(violations, isEmpty);
  });
}
