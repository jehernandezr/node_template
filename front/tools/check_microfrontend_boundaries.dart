// Verifica que un microfrontend no dependa de otro.
//
// Los microfrontends dependen solo de `front/packages` y nunca entre sí. Con
// pub workspaces un `import 'package:mf_x/...'` compila aunque no esté
// declarado, así que este script lo revisa en el código y en el pubspec.
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
// 1 cuando el `pubspec.yaml` declara otro `mf_*` o cuando un archivo de `lib/`,
// `test/` o `bin/` importa o exporta `package:mf_*` de otro microfrontend.
// Termina con código 2 si no encuentra el pubspec o la carpeta pedida.

import 'dart:io';

final _directive = RegExp(
  r'''^\s*(?:import|export)\s+['"]package:(mf_[A-Za-z0-9_]+)/''',
  multiLine: true,
);
final _name = RegExp(r'^name:\s*([A-Za-z0-9_]+)\s*$', multiLine: true);
final _dependency = RegExp(r'^ {2}(mf_[A-Za-z0-9_]+)\s*:', multiLine: true);

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
      'OK: ${roots.length} microfrontend(s) sin dependencias entre sí.',
    );
    return;
  }
  stderr.writeln(
    'FALLO: un microfrontend depende de otro. Lo compartido va en '
    'front/packages o en el shell:',
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
  return violations;
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
