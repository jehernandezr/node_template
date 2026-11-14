import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Carpetas de `lib/src` que solo pueden viajar en chunks diferidos.
const _deferredOnly = ['data', 'screens', 'l10n'];

final _directive = RegExp(
  r'''^\s*(import|export)\s+['"]([^'"]+)['"]([^;]*);''',
  multiLine: true,
);

/// Directiva `import` o `export` de un archivo del paquete.
final class _Edge {
  _Edge(this.from, this.target, {required this.deferred});

  final String from;
  final String target;
  final bool deferred;
}

/// Archivos de este paquete a los que apunta [uri] desde [from], o null si es
/// de otro paquete o de `dart:`.
String? _resolve(String from, String uri) {
  if (uri.startsWith('package:mf_notifications/')) {
    return 'lib/${uri.substring('package:mf_notifications/'.length)}';
  }
  if (uri.contains(':')) return null;
  return File(from).parent.uri.resolve(uri).toFilePath();
}

List<_Edge> _edgesOf(String path) => [
  for (final match in _directive.allMatches(File(path).readAsStringSync()))
    if (_resolve(path, match.group(2)!) case final target?)
      _Edge(
        path,
        _normalize(target),
        deferred: match.group(3)!.contains('deferred as'),
      ),
];

String _normalize(String path) =>
    Uri.file(path)
        .normalizePath()
        .toFilePath()
        .replaceFirst(RegExp(r'^\./'), '');

/// Archivos alcanzables desde [entry] siguiendo solo imports y exports no
/// diferidos.
Set<String> _eagerClosure(String entry) {
  final seen = <String>{};
  final pending = [entry];
  while (pending.isNotEmpty) {
    final file = pending.removeLast();
    if (!seen.add(file)) continue;
    for (final edge in _edgesOf(file)) {
      if (!edge.deferred) pending.add(edge.target);
    }
  }
  return seen;
}

bool _isDeferredOnly(String path) =>
    _deferredOnly.any((dir) => path.startsWith('lib/src/$dir/'));

void main() {
  const manifest = 'lib/mf_notifications.dart';

  test('the manifest reaches no data, screens or l10n code eagerly', () {
    final eager = _eagerClosure(manifest);
    expect(eager, contains(manifest));
    expect(eager, contains('lib/src/lifecycle/notifications_lifecycle.dart'));
    expect(eager.where(_isDeferredOnly), isEmpty);
  });

  // El grafo sigue la URI por defecto de cada import condicional: es la que
  // compila la web, el único destino con bundle inicial.
  test('on the web the lifecycle loads the data library deferred', () {
    final lifecycle = _edgesOf(
      'lib/src/lifecycle/notifications_lifecycle.dart',
    );
    expect(lifecycle.where((e) => _isDeferredOnly(e.target)), isEmpty);
    final bridge = lifecycle.singleWhere(
      (e) => e.target == 'lib/src/lifecycle/unread_counts.dart',
    );
    expect(bridge.deferred, isFalse);

    final toData = _edgesOf(bridge.target)
        .where((e) => _isDeferredOnly(e.target))
        .toList();
    expect(toData.map((e) => e.target), [
      'lib/src/data/notifications_scope.dart',
    ]);
    expect(toData.single.deferred, isTrue);
  });

  test('only the VM swaps in the direct bridge', () {
    final source = File('lib/src/lifecycle/notifications_lifecycle.dart')
        .readAsStringSync();
    expect(
      source,
      contains(
        "import 'unread_counts.dart' if (dart.library.io) "
        "'unread_counts_io.dart';",
      ),
    );
  });

  test('the screens are a deferred import of the manifest', () {
    final edges = _edgesOf(manifest);
    final screens = edges.singleWhere(
      (e) => e.target == 'lib/src/screens/screens.dart',
    );
    expect(screens.deferred, isTrue);
  });

  test('shared folders follow the ADR 0015 dependency rules', () {
    const allowed = {
      'enums': <String>{},
      'constants': {'enums'},
      'types': {'enums', 'constants', 'types'},
      'utils': {'enums', 'constants', 'types', 'utils'},
    };
    final shared = Directory('lib/src/shared');
    for (final file in shared.listSync(recursive: true).whereType<File>()) {
      final path = _normalize(file.path);
      final folder = path.split('/')[3];
      for (final edge in _edgesOf(path)) {
        expect(
          edge.target.startsWith('lib/src/shared/'),
          isTrue,
          reason: '$path imports ${edge.target}',
        );
        final targetFolder = edge.target.split('/')[3];
        if (targetFolder == folder && folder != 'enums') continue;
        expect(
          allowed[folder],
          contains(targetFolder),
          reason: '$path imports ${edge.target}',
        );
      }
    }
  });
}
