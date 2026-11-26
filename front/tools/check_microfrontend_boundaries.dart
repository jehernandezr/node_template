/// Checks the import boundaries of a microfrontend (ADR 0015 and 0018).
///
/// - It does not depend on another microfrontend: they depend only on `front/packages`. With
/// pub workspaces an `import 'package:mf_x/...'` compiles even if not
/// declared, so it is checked in the code and in the pubspec.
/// - The manifest (`lib/<name>.dart`) only reaches without `deferred` the
/// folders that can go in the initial bundle: `src/shared/constants`,
/// `src/shared/enums` and `src/lifecycle`. It is the same rule that
/// `check_deferred_chunks.dart` checks on the web build, here without building.
/// - Inside `src/shared`, each folder imports only the previous ones:
/// `enums` none, `constants` enums, `types` enums and constants, `utils`
/// all three.
///
/// Runs from a microfrontend folder (the Nx `analyze` task of
/// the `type:front-microfrontends` projects does it):
///
/// dart run ../../tools/check_microfrontend_boundaries.dart
///
/// or for all of them, from `front/`:
///
/// dart run tools/check_microfrontend_boundaries.dart --all
///
/// It is a standalone script (no pubspec): it only uses `dart:*`. Fails with code
/// 1 on any violation and exits with code 2 if it does not find the
/// pubspec or the requested folder. A conditional import is followed through its default
/// URI, the one the web compiles.
library;

import 'dart:io';

final _directive = RegExp(
  r'''^\s*(?:import|export)\s+['"]package:(mf_[A-Za-z0-9_]+)/''',
  multiLine: true,
);
final _name = RegExp(r'^name:\s*([A-Za-z0-9_]+)\s*$', multiLine: true);
final _dependency = RegExp(r'^ {2}(mf_[A-Za-z0-9_]+)\s*:', multiLine: true);

/// `import` or `export` with its URI and what follows up to the `;`.
final _edge = RegExp(
  r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]([^;]*);''',
  multiLine: true,
);

/// Folders of `lib/src` the manifest can reach without `deferred`.
const _eagerDirs = ['shared/constants/', 'shared/enums/', 'lifecycle/'];

/// Folders of `src/shared` each one can import, besides itself.
const _sharedRules = {
  'enums': <String>{},
  'constants': {'enums'},
  'types': {'enums', 'constants'},
  'utils': {'enums', 'constants', 'types'},
};

void main(List<String> args) {
  final all = args.contains('--all');
  final unknown = args.where((arg) => arg != '--all');
  if (unknown.isNotEmpty) _fatal('Unknown option: ${unknown.first}');

  final roots = all ? _allMicrofrontends() : [Directory.current];
  final violations = <String>[
    for (final root in roots) ...checkMicrofrontend(root),
  ];
  if (violations.isEmpty) {
    stdout.writeln(
      'OK: ${roots.length} microfrontend(s) respect their import boundaries.',
    );
    return;
  }
  stderr.writeln(
    'FAILURE: import boundaries. Shared code goes in front/packages, and '
    'anything that is not a manifest, constant, enum or lifecycle is loaded with '
    '`deferred`:',
  );
  for (final violation in violations) {
    stderr.writeln('  - $violation');
  }
  exit(1);
}

/// Violations of the microfrontend rooted at [root].
List<String> checkMicrofrontend(Directory root) {
  final pubspec = File('${root.path}/pubspec.yaml');
  if (!pubspec.existsSync()) _fatal('${pubspec.path} does not exist.');
  final text = pubspec.readAsStringSync();
  final own = _name.firstMatch(text)?.group(1);
  if (own == null) _fatal('${pubspec.path} has no `name`.');

  final violations = <String>[
    for (final match in _dependency.allMatches(_dependencySections(text)))
      if (match.group(1) != own)
        '${pubspec.path}: declares the dependency ${match.group(1)}',
  ];
  for (final folder in const ['lib', 'test', 'bin']) {
    final dir = Directory('${root.path}/$folder');
    if (!dir.existsSync()) continue;
    final files =
        dir
            .listSync(recursive: true)
            .whereType<File>()
            .where((file) => file.path.endsWith('.dart'))
            .toList()
          ..sort((a, b) => a.path.compareTo(b.path));
    for (final file in files) {
      for (final match in _directive.allMatches(file.readAsStringSync())) {
        final target = match.group(1)!;
        if (target != own) violations.add('${file.path}: uses package:$target');
      }
    }
  }
  final lib = Directory('${root.path}/lib');
  if (lib.existsSync()) {
    violations
      ..addAll(_eagerViolations(lib, own))
      ..addAll(_sharedViolations(lib, own));
  }
  return violations;
}

/// Files of `lib/src` the manifest reaches without `deferred` outside
/// [_eagerDirs].
List<String> _eagerViolations(Directory lib, String own) {
  final manifest = File('${lib.path}/$own.dart');
  if (!manifest.existsSync()) return ['${manifest.path}: does not exist'];
  final seen = <String>{};
  final pending = [manifest.absolute.path];
  final violations = <String>[];
  while (pending.isNotEmpty) {
    final path = pending.removeLast();
    if (!seen.add(path)) continue;
    final relative = _libRelative(lib, path);
    if (relative.startsWith('src/') &&
        !_eagerDirs.any((dir) => relative.startsWith('src/$dir'))) {
      violations.add(
        '${lib.path}/$relative: the manifest loads it without deferred',
      );
    }
    for (final (target, deferred) in _localEdges(lib, own, path)) {
      if (!deferred) pending.add(target);
    }
  }
  return violations;
}

/// Imports between `src/shared` folders that do not follow [_sharedRules].
List<String> _sharedViolations(Directory lib, String own) {
  final shared = Directory('${lib.path}/src/shared');
  if (!shared.existsSync()) return const [];
  final violations = <String>[];
  final files =
      shared
          .listSync(recursive: true)
          .whereType<File>()
          .where((file) => file.path.endsWith('.dart'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  for (final file in files) {
    final relative = _libRelative(lib, file.absolute.path);
    final folder = relative.split('/')[2];
    final allowed = _sharedRules[folder];
    if (allowed == null) {
      violations.add('${lib.path}/$relative: unknown shared folder');
      continue;
    }
    for (final (target, _) in _localEdges(lib, own, file.absolute.path)) {
      final parts = _libRelative(lib, target).split('/');
      final ok =
          parts.length > 3 &&
          parts[1] == 'shared' &&
          (parts[2] == folder || allowed.contains(parts[2]));
      if (!ok) {
        violations.add(
          '${lib.path}/$relative: imports ${parts.join('/')}, outside what '
          'shared/$folder allows',
        );
      }
    }
  }
  return violations;
}

/// Imports and exports of [path] to files of this package, with whether they are
/// deferred.
Iterable<(String, bool)> _localEdges(
  Directory lib,
  String own,
  String path,
) sync* {
  final source = File(path);
  if (!source.existsSync()) return;
  for (final match in _edge.allMatches(source.readAsStringSync())) {
    final uri = match.group(1)!;
    final String target;
    if (uri.startsWith('package:$own/')) {
      target = '${lib.absolute.path}/${uri.substring('package:$own/'.length)}';
    } else if (uri.contains(':')) {
      continue;
    } else {
      target = source.parent.uri.resolve(uri).toFilePath();
    }
    yield (
      Uri.file(target).normalizePath().toFilePath(),
      match.group(2)!.contains('deferred as'),
    );
  }
}

/// [path] relative to [lib], with `/`.
String _libRelative(Directory lib, String path) {
  final base = Uri.directory(lib.absolute.path).normalizePath().toFilePath();
  final normalized = Uri.file(path).normalizePath().toFilePath();
  return normalized.startsWith(base)
      ? normalized.substring(base.length)
      : normalized;
}

/// Text of the `dependencies`, `dev_dependencies` and
/// `dependency_overrides` sections of the pubspec.
String _dependencySections(String pubspec) {
  final buffer = StringBuffer();
  var inside = false;
  for (final line in pubspec.split('\n')) {
    final top = RegExp(r'^([A-Za-z_]+):').firstMatch(line);
    if (top != null) {
      inside = const {
        'dependencies',
        'dev_dependencies',
        'dependency_overrides',
      }.contains(top.group(1));
      continue;
    }
    if (inside) buffer.writeln(line);
  }
  return buffer.toString();
}

/// Folders of `front/microfrontends/*`, looking for `front/` from the current
/// directory upwards.
List<Directory> _allMicrofrontends() {
  var dir = Directory.current.absolute;
  while (true) {
    final candidate = Directory('${dir.path}/microfrontends');
    if (candidate.existsSync()) {
      return candidate.listSync().whereType<Directory>().where((d) {
        return File('${d.path}/pubspec.yaml').existsSync();
      }).toList()..sort((a, b) => a.path.compareTo(b.path));
    }
    final parent = dir.parent;
    if (parent.path == dir.path) {
      _fatal('front/microfrontends not found from ${Directory.current}.');
    }
    dir = parent;
  }
}

Never _fatal(String message) {
  stderr.writeln('Error: $message');
  exit(2);
}
