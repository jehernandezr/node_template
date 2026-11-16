import 'dart:io';

import 'scaffold_exception.dart';
import 'scaffold_names.dart';
import 'scaffold_result.dart';
import 'template_directory.dart';
import 'template_renderer.dart';
import 'workspace_pubspec.dart';

/// Writes the package of a new microfrontend and registers it in the
/// workspace.
///
/// `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`
final class MicrofrontendScaffolder {
  /// Creates the scaffolder for the microfrontend [id] under [frontRoot]
  /// (the `front/` folder). [templates] defaults to the `templates/` folder
  /// of this package under [frontRoot]; [workspace] edits `pubspec.yaml`.
  /// Nothing is validated here: [create] validates before it writes.
  MicrofrontendScaffolder({
    required Directory frontRoot,
    required this._id,
    TemplateDirectory? templates,
    this._workspace = const WorkspacePubspec(),
  }) : _frontRoot = frontRoot,
       _templates =
           templates ??
           TemplateDirectory(
             Directory.fromUri(
               frontRoot.absolute.uri.resolve(
                 'tools/new_microfrontend/templates/',
               ),
             ),
           );

  final Directory _frontRoot;
  final String _id;
  final TemplateDirectory _templates;
  final WorkspacePubspec _workspace;

  /// Writes the package, adds it to `front/pubspec.yaml`, and returns the
  /// files it created plus the lines to add to each app. Throws
  /// `ScaffoldException` before writing anything when the id or a label is
  /// invalid, `microfrontends/<id>` already exists, `pubspec.yaml` cannot
  /// take the member or a template uses an unknown placeholder.
  ScaffoldResult create({
    required String menuLabelEs,
    required String menuLabelEn,
  }) {
    final names = ScaffoldNames(
      id: _id,
      menuLabelEs: menuLabelEs,
      menuLabelEn: menuLabelEn,
    );
    final target = Directory('${_frontRoot.path}/microfrontends/$_id');
    if (target.existsSync()) {
      throw ScaffoldException('Ya existe la carpeta ${target.path}.');
    }
    final pubspec = File('${_frontRoot.path}/pubspec.yaml');
    if (!pubspec.existsSync()) {
      throw ScaffoldException('No existe ${pubspec.path}.');
    }
    final workspace = _workspace.addMember(
      pubspec.readAsStringSync(),
      'microfrontends/$_id',
    );
    final renderer = TemplateRenderer(names.placeholders);
    final files = [
      for (final template in _templates.read())
        TemplateFile(
          relativePath: renderer.render(template.relativePath),
          content: renderer.render(template.content),
        ),
    ];
    for (final file in files) {
      File('${target.path}/${file.relativePath}')
        ..createSync(recursive: true)
        ..writeAsStringSync(file.content);
    }
    pubspec.writeAsStringSync(workspace);
    final created = [
      for (final file in files) 'microfrontends/$_id/${file.relativePath}',
    ]..sort();
    return ScaffoldResult(
      files: created,
      appImport: "import 'package:mf_$_id/mf_$_id.dart' show ${_id}Manifest;",
      appRegistration: '${_id}Manifest,',
      appDependency: '  mf_$_id:\n    path: ../../microfrontends/$_id',
    );
  }
}
