import 'dart:io';

/// Copies the real `templates/` folder of this package under a front root, so
/// the scaffolder finds its templates the way the CLI does.
final class TemplateFixture {
  const TemplateFixture();

  /// Copies every template into `tools/new_microfrontend/templates` under
  /// [frontRoot]. The tests run with the package as the working directory.
  void copyInto(Directory frontRoot) {
    final source = Directory('templates');
    final target = Directory(
      '${frontRoot.path}/tools/new_microfrontend/templates',
    )..createSync(recursive: true);
    for (final entity in source.listSync(recursive: true)) {
      final relative = entity.path.substring(source.path.length);
      if (entity is Directory) {
        Directory('${target.path}$relative').createSync(recursive: true);
      } else if (entity is File) {
        File(entity.path).copySync('${target.path}$relative');
      }
    }
  }
}
