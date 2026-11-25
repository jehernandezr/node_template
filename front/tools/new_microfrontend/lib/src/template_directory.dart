import 'dart:io';

import 'scaffold_exception.dart';

/// One template: where the file goes and what it holds, both still with
/// placeholders.
final class TemplateFile {
  /// Creates a template file.
  const TemplateFile({required this.relativePath, required this.content});

  /// Path inside the new package, without the `.tmpl` suffix.
  final String relativePath;

  /// Text of the template.
  final String content;
}

/// The `templates/` folder of this package. Every file there ends in `.tmpl`
/// so the formatter and the analyzer skip it.
final class TemplateDirectory {
  /// Creates the reader over [root].
  const TemplateDirectory(this.root);

  static const String _suffix = '.tmpl';

  /// Folder that holds the templates.
  final Directory root;

  /// Every template, sorted by path. Throws `ScaffoldException` when [root]
  /// does not exist or holds no file.
  List<TemplateFile> read() {
    if (!root.existsSync()) {
      throw ScaffoldException('Templates folder does not exist: ${root.path}');
    }
    final base = root.absolute.uri.path;
    final prefix = base.endsWith('/') ? base : '$base/';
    final files = <TemplateFile>[];
    for (final entity in root.listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith(_suffix)) continue;
      final full = entity.absolute.uri.path;
      final relative = full.substring(
        prefix.length,
        full.length - _suffix.length,
      );
      files.add(
        TemplateFile(
          relativePath: Uri.decodeComponent(relative),
          content: entity.readAsStringSync(),
        ),
      );
    }
    if (files.isEmpty) {
      throw ScaffoldException(
        'Templates folder has no .tmpl files: ${root.path}',
      );
    }
    files.sort((a, b) => a.relativePath.compareTo(b.relativePath));
    return files;
  }
}
