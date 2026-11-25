// Checks that deferred microfrontends do not ship in the initial bundle.
//
// Runs after `flutter build web --release --source-maps`, from
// `front/apps/web`:
//
//   dart run tools/check_deferred_chunks.dart
//
// It is a standalone script (no pubspec): it only uses `dart:*`. Fails with
// code 1 when:
//   1. `main.dart.js.map` lists sources from `microfrontends/<mf>/lib/src/`
//      outside the folders the manifest can load eagerly
//      (`shared/constants`, `shared/enums` and `lifecycle`). Everything else
//      (screens, data, texts, widgets, utilities) must live only in
//      deferred chunks, even if it is in a new folder.
//   2. some text from the backoffice ARB files appears in `main.dart.js`.
//
// Options:
//   --build-dir=<path>   Build output. Defaults to `build/web`.
//   --front-root=<path>  Root of `front/`. Defaults to the one containing
//                        `microfrontends/` going up from the current directory
//                        or from this script.
//   --arb-mf=<name>      Microfrontend whose ARB files cannot be in the initial
//                        bundle. Repeatable. Defaults to `backoffice`.
//   --min-length=<n>     Minimum length of an ARB text to check it
//                        (avoids false positives with single words).
//                        Defaults to 12.

import 'dart:convert';
import 'dart:io';

/// Folders of a microfrontend's `lib/src/` that can go in the initial
/// bundle: what the manifest and the lifecycle need at startup.
const _eagerSourceDirs = ['shared/constants/', 'shared/enums/', 'lifecycle/'];

void main(List<String> args) {
  final options = _Options.parse(args);
  final frontRoot = options.frontRoot ?? _findFrontRoot();
  if (frontRoot == null) {
    _fatal(
      'No se encontró la raíz de front/ (directorio con microfrontends/). '
      'Pásala con --front-root=<ruta>.',
    );
  }

  final buildDir = Directory(options.buildDir);
  final mainJs = File('${buildDir.path}/main.dart.js');
  final mainMap = File('${buildDir.path}/main.dart.js.map');
  for (final f in [mainJs, mainMap]) {
    if (!f.existsSync()) {
      _fatal(
        'Falta ${f.path}. Compila antes con '
        '`flutter build web --release --source-maps`.',
      );
    }
  }

  stdout.writeln('Build: ${buildDir.path}');
  stdout.writeln('Front: $frontRoot');
  stdout.writeln('');

  final sourceViolations = _checkSourceMap(mainMap);
  final textViolations = _checkArbStrings(
    mainJs: mainJs,
    frontRoot: frontRoot,
    microfrontends: options.arbMicrofrontends,
    minLength: options.minLength,
  );

  if (sourceViolations.isEmpty && textViolations.isEmpty) {
    stdout.writeln('OK: el bundle inicial no contiene código diferido.');
    return;
  }

  if (sourceViolations.isNotEmpty) {
    stderr.writeln(
      'FALLO 1: main.dart.js.map incluye ${sourceViolations.length} fuentes '
      'de microfrontends/*/lib/src/ fuera de '
      '{${_eagerSourceDirs.join(',')}} en el bundle inicial:',
    );
    for (final s in sourceViolations) {
      stderr.writeln('  - $s');
    }
    stderr.writeln(
      '  Causa probable: un import no diferido (sin `deferred as`) hacia '
      'esos archivos, directo o transitivo desde apps/web/lib/main.dart. '
      'Si el manifiesto los necesita, van en shared/constants o shared/enums.',
    );
    stderr.writeln('');
  }
  if (textViolations.isNotEmpty) {
    stderr.writeln(
      'FALLO 2: main.dart.js contiene ${textViolations.length} textos ARB '
      'que deben viajar solo en chunks diferidos:',
    );
    for (final v in textViolations) {
      stderr.writeln('  - [${v.mf}/${v.file}] ${v.key}: "${v.text}"');
    }
    stderr.writeln('');
  }
  exit(1);
}

/// Sources of the initial bundle map under a microfrontend's `lib/src/` and
/// outside [_eagerSourceDirs].
List<String> _checkSourceMap(File mapFile) {
  final map = jsonDecode(mapFile.readAsStringSync()) as Map<String, dynamic>;
  final sources = (map['sources'] as List).cast<String>();
  final found = <String>[
    for (final s in sources)
      if (isForbiddenEagerSource(s)) s,
  ]..sort();
  stdout.writeln(
    'Mapa de fuentes: ${sources.length} fuentes, '
    '${found.length} prohibidas.',
  );
  return found;
}

// Covers relative paths (`../../microfrontends/x/lib/src/data/a.dart`) and
// `package:mf_x/src/data/a.dart`.
final _byPath = RegExp(r'microfrontends/[^/]+/lib/src/(.+)$');
final _byPackage = RegExp(r'package:mf_[^/]+/src/(.+)$');

/// Whether [source] is code from a microfrontend's `lib/src/` that cannot go in
/// the initial bundle.
bool isForbiddenEagerSource(String source) {
  final match = _byPath.firstMatch(source) ?? _byPackage.firstMatch(source);
  if (match == null) return false;
  final rest = match.group(1)!;
  return !_eagerSourceDirs.any(rest.startsWith);
}

class _ArbText {
  _ArbText(this.mf, this.file, this.key, this.text);
  final String mf;
  final String file;
  final String key;
  final String text;
}

List<_ArbText> _checkArbStrings({
  required File mainJs,
  required String frontRoot,
  required List<String> microfrontends,
  required int minLength,
}) {
  final js = mainJs.readAsStringSync();
  final found = <_ArbText>[];
  var checked = 0;

  for (final mf in microfrontends) {
    final l10nDir = Directory('$frontRoot/microfrontends/$mf/lib/src/l10n');
    if (!l10nDir.existsSync()) {
      _fatal('No existe ${l10nDir.path}.');
    }
    final arbs =
        l10nDir
            .listSync()
            .whereType<File>()
            .where((f) => f.path.endsWith('.arb'))
            .toList()
          ..sort((a, b) => a.path.compareTo(b.path));
    if (arbs.isEmpty) {
      _fatal('No hay archivos .arb en ${l10nDir.path}.');
    }
    for (final arb in arbs) {
      final data = jsonDecode(arb.readAsStringSync()) as Map<String, dynamic>;
      for (final entry in data.entries) {
        final value = entry.value;
        if (entry.key.startsWith('@') || value is! String) continue;
        for (final literal in _literals(value)) {
          if (literal.length < minLength) continue;
          checked++;
          if (_variants(literal).any(js.contains)) {
            found.add(
              _ArbText(mf, arb.uri.pathSegments.last, entry.key, literal),
            );
          }
        }
      }
    }
  }

  stdout.writeln(
    'Textos ARB (${microfrontends.join(', ')}): $checked comprobados, '
    '${found.length} presentes en main.dart.js.',
  );
  stdout.writeln('');
  if (checked == 0) {
    _fatal('No se comprobó ningún texto ARB; revisa --min-length y las rutas.');
  }
  return found;
}

/// Literal segments of an ICU message: what remains after removing `{...}`.
Iterable<String> _literals(String message) => message
    .replaceAll(RegExp(r'\{[^{}]*(\{[^{}]*\}[^{}]*)*\}'), '\u0000')
    .split('\u0000')
    .map((s) => s.trim())
    .where((s) => s.isNotEmpty);

/// Forms in which dart2js can emit the text: literal and with escapes
/// (`\xHH` up to U+00FF, `\uHHHH` above).
Iterable<String> _variants(String text) sync* {
  yield text;
  final escaped = StringBuffer();
  var changed = false;
  for (final unit in text.codeUnits) {
    if (unit < 0x80) {
      escaped.writeCharCode(unit);
    } else {
      changed = true;
      escaped.write(
        unit <= 0xFF
            ? '\\x${unit.toRadixString(16).padLeft(2, '0')}'
            : '\\u${unit.toRadixString(16).padLeft(4, '0')}',
      );
    }
  }
  if (changed) yield escaped.toString();
}

String? _findFrontRoot() {
  final starts = <Directory>[
    Directory.current,
    File(Platform.script.toFilePath()).parent,
  ];
  for (final start in starts) {
    var dir = start.absolute;
    while (true) {
      if (Directory('${dir.path}/microfrontends').existsSync()) return dir.path;
      final parent = dir.parent;
      if (parent.path == dir.path) break;
      dir = parent;
    }
  }
  return null;
}

Never _fatal(String message) {
  stderr.writeln('Error: $message');
  exit(2);
}

class _Options {
  _Options({
    required this.buildDir,
    required this.frontRoot,
    required this.arbMicrofrontends,
    required this.minLength,
  });

  final String buildDir;
  final String? frontRoot;
  final List<String> arbMicrofrontends;
  final int minLength;

  static _Options parse(List<String> args) {
    var buildDir = 'build/web';
    String? frontRoot;
    final mfs = <String>[];
    var minLength = 12;
    for (final arg in args) {
      final eq = arg.indexOf('=');
      final name = eq == -1 ? arg : arg.substring(0, eq);
      final value = eq == -1 ? '' : arg.substring(eq + 1);
      switch (name) {
        case '--build-dir':
          buildDir = value;
        case '--front-root':
          frontRoot = value;
        case '--arb-mf':
          mfs.add(value);
        case '--min-length':
          minLength = int.tryParse(value) ?? _fatal('--min-length inválido');
        default:
          _fatal('Opción desconocida: $arg');
      }
    }
    return _Options(
      buildDir: buildDir,
      frontRoot: frontRoot,
      arbMicrofrontends: mfs.isEmpty ? ['backoffice'] : mfs,
      minLength: minLength,
    );
  }
}
