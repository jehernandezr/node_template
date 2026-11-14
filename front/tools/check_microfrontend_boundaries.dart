// Verifica las fronteras de import de un microfrontend (ADR 0015 y 0018).
//
// - No depende de otro microfrontend: dependen solo de `front/packages`. Con
//   pub workspaces un `import 'package:mf_x/...'` compila aunque no esté
//   declarado, así que se revisa en el código y en el pubspec.
// - El manifiesto (`lib/<nombre>.dart`) solo alcanza sin `deferred` las
//   carpetas que pueden ir en el bundle inicial: `src/shared/constants`,
//   `src/shared/enums` y `src/lifecycle`. Es la misma regla que comprueba
//   `check_deferred_chunks.dart` sobre la compilación web, aquí sin compilar.
// - Dentro de `src/shared`, cada carpeta importa solo las anteriores:
//   `enums` ninguna, `constants` enums, `types` enums y constants, `utils`
//   las tres.
//
// Se ejecuta desde la carpeta de un microfrontend (la tarea `analyze` de Nx de
// los proyectos `type:front-microfrontends` lo hace):
//
//   dart run ../../tools/check_microfrontend_boundaries.dart
//
// o para todos, desde `front/`:
//
//   dart run tools/check_microfrontend_boundaries.dart --all
//
// Es un script independiente (sin pubspec): solo usa `dart:*`. Falla con código
// 1 ante cualquier violación y termina con código 2 si no encuentra el
// pubspec o la carpeta pedida. Un import condicional se sigue por su URI por
// defecto, la que compila la web.

import 'dart:io';

final _directive = RegExp(
  r'''^\s*(?:import|export)\s+['"]package:(mf_[A-Za-z0-9_]+)/''',
  multiLine: true,
);
final _name = RegExp(r'^name:\s*([A-Za-z0-9_]+)\s*$', multiLine: true);
final _dependency = RegExp(r'^ {2}(mf_[A-Za-z0-9_]+)\s*:', multiLine: true);

/// `import` o `export` con su URI y lo que sigue hasta el `;`.
final _edge = RegExp(
  r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]([^;]*);''',
  multiLine: true,
);

/// Carpetas de `lib/src` que el manifiesto puede alcanzar sin `deferred`.
const _eagerDirs = ['shared/constants/', 'shared/enums/', 'lifecycle/'];

/// Carpetas de `src/shared` que puede importar cada una, además de sí misma.
const _sharedRules = {
  'enums': <String>{},
  'constants': {'enums'},
  'types': {'enums', 'constants'},
  'utils': {'enums', 'constants', 'types'},
};

void main(List<String> args) {
  final all = args.contains('--all');
  final unknown = args.where((arg) => arg != '--all');
  if (unknown.isNotEmpty) _fatal('Opción desconocida: ${unknown.first}');

  final roots = all ? _allMicrofrontends() : [Directory.current];
  final violations = <String>[
    for (final root in roots) ...checkMicrofrontend(root),
  ];
  if (violations.isEmpty) {
    stdout.writeln(
      'OK: ${roots.length} microfrontend(s) respetan sus fronteras de import.',
    );
    return;
  }
  stderr.writeln(
    'FALLO: fronteras de import. Lo compartido va en front/packages, y lo '
    'que no es manifiesto, constante, enum o ciclo de vida se carga con '
    '`deferred`:',
  );
  for (final violation in violations) {
    stderr.writeln('  - $violation');
  }
  exit(1);
}

/// Violaciones del microfrontend con raíz en [root].
List<String> checkMicrofrontend(Directory root) {
  final pubspec = File('${root.path}/pubspec.yaml');
  if (!pubspec.existsSync()) _fatal('No existe ${pubspec.path}.');
  final text = pubspec.readAsStringSync();
  final own = _name.firstMatch(text)?.group(1);
  if (own == null) _fatal('${pubspec.path} no tiene `name`.');

  final violations = <String>[
    for (final match in _dependency.allMatches(_dependencySections(text)))
      if (match.group(1) != own)
        '${pubspec.path}: declara la dependencia ${match.group(1)}',
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
        if (target != own) violations.add('${file.path}: usa package:$target');
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

/// Archivos de `lib/src` que el manifiesto alcanza sin `deferred` fuera de
/// [_eagerDirs].
List<String> _eagerViolations(Directory lib, String own) {
  final manifest = File('${lib.path}/$own.dart');
  if (!manifest.existsSync()) return ['${manifest.path}: no existe'];
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
        '${lib.path}/$relative: el manifiesto lo carga sin deferred',
      );
    }
    for (final (target, deferred) in _localEdges(lib, own, path)) {
      if (!deferred) pending.add(target);
    }
  }
  return violations;
}

/// Imports entre carpetas de `src/shared` que no siguen [_sharedRules].
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
      violations.add('${lib.path}/$relative: carpeta compartida desconocida');
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
          '${lib.path}/$relative: importa ${parts.join('/')}, fuera de lo '
          'que permite shared/$folder',
        );
      }
    }
  }
  return violations;
}

/// Imports y exports de [path] hacia archivos de este paquete, con si son
/// diferidos.
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

/// [path] relativo a [lib], con `/`.
String _libRelative(Directory lib, String path) {
  final base = Uri.directory(lib.absolute.path).normalizePath().toFilePath();
  final normalized = Uri.file(path).normalizePath().toFilePath();
  return normalized.startsWith(base)
      ? normalized.substring(base.length)
      : normalized;
}

/// Texto de las secciones `dependencies`, `dev_dependencies` y
/// `dependency_overrides` del pubspec.
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

/// Carpetas de `front/microfrontends/*`, buscando `front/` desde el directorio
/// actual hacia arriba.
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
      _fatal('No se encontró front/microfrontends desde ${Directory.current}.');
    }
    dir = parent;
  }
}

Never _fatal(String message) {
  stderr.writeln('Error: $message');
  exit(2);
}
