import 'dart:convert';
import 'dart:io';

import 'generator.dart';
import 'model.dart';

const _usage = '''
Uso: dart run contracts_gen [--check] [--front <dir>] [--contracts <dir>]

Genera packages/contracts/lib/src/<servicio>/ y
packages/i18n/lib/src/generated/error_messages.dart desde
backend/libs/contracts/<servicio>/export/contract.json.

  --check        No escribe nada; termina con código 1 si el Dart difiere.
  --front        Carpeta front/ (por defecto, la que contiene el directorio actual).
  --contracts    Carpeta con los contratos (por defecto, <front>/../backend/libs/contracts).
''';

/// Busca hacia arriba la carpeta del pub workspace del front.
Directory? findFrontRoot(Directory start) {
  Directory? current = start.absolute;
  while (current != null) {
    final pubspec = File('${current.path}/pubspec.yaml');
    if (pubspec.existsSync() &&
        pubspec.readAsStringSync().contains(
          RegExp(r'^name: front_workspace$', multiLine: true),
        )) {
      return current;
    }
    final parent = current.parent;
    current = parent.path == current.path ? null : parent;
  }
  return null;
}

/// Lee `<contracts>/<servicio>/export/contract.json` de cada servicio.
Map<String, Json> readContracts(Directory contracts) {
  final docs = <String, Json>{};
  final dirs = contracts.listSync().whereType<Directory>().toList()
    ..sort((a, b) => a.path.compareTo(b.path));
  for (final dir in dirs) {
    final file = File('${dir.path}/export/contract.json');
    if (!file.existsSync()) continue;
    final service = dir.uri.pathSegments.where((s) => s.isNotEmpty).last;
    docs[service] = jsonDecode(file.readAsStringSync()) as Json;
  }
  if (docs.isEmpty) {
    throw GeneratorException('no hay contract.json en ${contracts.path}');
  }
  return docs;
}

/// Archivos `.dart` generados que hay hoy en `lib/src` (los que empiezan con la cabecera).
Set<String> existingGenerated(Directory src) {
  if (!src.existsSync()) return {};
  final result = <String>{};
  for (final entity in src.listSync(recursive: true)) {
    if (entity is! File || !entity.path.endsWith('.dart')) continue;
    final relative = entity.path.substring(src.path.length + 1);
    if (relative.startsWith('core/')) continue;
    if (entity.readAsStringSync().startsWith(generatedHeader)) {
      result.add(relative);
    }
  }
  return result;
}

/// Ejecuta el generador. Devuelve el código de salida.
Future<int> run(
  List<String> args, {
  IOSink? stdoutSink,
  IOSink? stderrSink,
}) async {
  final out = stdoutSink ?? stdout;
  final err = stderrSink ?? stderr;
  var check = false;
  String? frontArg;
  String? contractsArg;
  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--check':
        check = true;
      case '--front' when i + 1 < args.length:
        frontArg = args[++i];
      case '--contracts' when i + 1 < args.length:
        contractsArg = args[++i];
      case '-h' || '--help':
        out.write(_usage);
        return 0;
      default:
        err.write('Argumento desconocido: ${args[i]}\n\n$_usage');
        return 64;
    }
  }

  final front = frontArg != null
      ? Directory(frontArg)
      : findFrontRoot(Directory.current);
  if (front == null || !front.existsSync()) {
    err.writeln(
      'No encuentro la carpeta front/ (pubspec con name: front_workspace).',
    );
    return 66;
  }
  final contracts = Directory(
    contractsArg ?? '${front.path}/../backend/libs/contracts',
  );
  final src = Directory('${front.path}/packages/contracts/lib/src');

  final i18nSrc = Directory('${front.path}/packages/i18n/lib/src');
  final Map<String, String> files;
  final String errorMessages;
  try {
    final model = ContractModel(readContracts(contracts));
    files = generate(model);
    errorMessages = generateErrorMessages(model);
  } on GeneratorException catch (error) {
    err.writeln(error);
    return 1;
  }

  final stale = existingGenerated(src).difference(files.keys.toSet());
  final changed = <String>[
    for (final entry in files.entries)
      if (!_sameContent(File('${src.path}/${entry.key}'), entry.value))
        entry.key,
  ];

  final messagesFile = File('${i18nSrc.path}/$errorMessagesPath');
  final messagesChanged = !_sameContent(messagesFile, errorMessages);

  if (check) {
    if (changed.isEmpty && stale.isEmpty && !messagesChanged) {
      out.writeln('Contratos Dart al día (${files.length + 1} archivos).');
      return 0;
    }
    err.writeln('El Dart generado no coincide con los contratos:');
    for (final path in changed) {
      err.writeln('  cambia  packages/contracts/lib/src/$path');
    }
    for (final path in stale) {
      err.writeln('  sobra   packages/contracts/lib/src/$path');
    }
    if (messagesChanged) {
      err.writeln('  cambia  packages/i18n/lib/src/$errorMessagesPath');
    }
    err.writeln('Ejecuta: cd front && dart run contracts_gen');
    return 1;
  }

  for (final path in changed) {
    final file = File('${src.path}/$path');
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(files[path]!);
  }
  for (final path in stale) {
    File('${src.path}/$path').deleteSync();
  }
  if (messagesChanged) {
    messagesFile.parent.createSync(recursive: true);
    messagesFile.writeAsStringSync(errorMessages);
  }
  out.writeln(
    'Generados ${files.length + 1} archivos: '
    '${changed.length + (messagesChanged ? 1 : 0)} cambiados, '
    '${stale.length} borrados.',
  );
  return 0;
}

bool _sameContent(File file, String content) =>
    file.existsSync() && file.readAsStringSync() == content;
