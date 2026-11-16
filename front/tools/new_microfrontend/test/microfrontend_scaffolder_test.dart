import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

import 'utils/template_fixture.dart';

const String _frontPubspec =
    'name: front_workspace\n\nworkspace:\n  - microfrontends/tasks\n  - packages/ui\n';

void main() {
  late Directory frontRoot;
  late String pubspecPath;

  setUp(() {
    frontRoot = Directory.systemTemp.createTempSync('front_');
    addTearDown(() => frontRoot.deleteSync(recursive: true));
    pubspecPath = '${frontRoot.path}/pubspec.yaml';
    File(pubspecPath).writeAsStringSync(_frontPubspec);
  });

  MicrofrontendScaffolder scaffolder({
    String id = 'reports',
    TemplateDirectory? templates,
  }) => MicrofrontendScaffolder(
    frontRoot: frontRoot,
    id: id,
    templates: templates ?? TemplateDirectory(Directory('templates')),
  );

  List<String> treeOf(Directory directory) => [
    for (final entity in directory.listSync(recursive: true))
      entity.path.substring(frontRoot.path.length),
  ]..sort();

  test('creates the package files', () {
    scaffolder().create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports');

    final root = '${frontRoot.path}/microfrontends/reports';
    for (final path in [
      'pubspec.yaml',
      'lib/mf_reports.dart',
      'lib/src/shared/constants/reports_paths.dart',
      'test/manifest_test.dart',
    ]) {
      expect(File('$root/$path').existsSync(), isTrue, reason: path);
    }
  });

  test('leaves no placeholder in any created file', () {
    final result = scaffolder().create(
      menuLabelEs: 'Reportes',
      menuLabelEn: 'Reports',
    );

    for (final file in result.files) {
      final content = File('${frontRoot.path}/$file').readAsStringSync();
      expect(content, isNot(contains('{{')), reason: file);
    }
  });

  test('lists the member in the workspace before the existing ones', () {
    scaffolder().create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports');

    final lines = File(pubspecPath).readAsLinesSync();
    expect(
      lines.indexOf('  - microfrontends/reports'),
      lessThan(lines.indexOf('  - microfrontends/tasks')),
    );
    expect(lines.where((line) => line.contains('packages/ui')), hasLength(1));
  });

  test('returns sorted files under the package and the app lines', () {
    final result = scaffolder().create(
      menuLabelEs: 'Reportes',
      menuLabelEn: 'Reports',
    );

    expect(result.files.first, startsWith('microfrontends/reports/'));
    expect(result.files, [...result.files]..sort());
    expect(
      result.appImport,
      "import 'package:mf_reports/mf_reports.dart' show reportsManifest;",
    );
    expect(result.appRegistration, 'reportsManifest,');
    expect(
      result.appDependency,
      '  mf_reports:\n    path: ../../microfrontends/reports',
    );
  });

  test('a second create throws and changes nothing', () {
    scaffolder().create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports');
    final pubspecBefore = File(pubspecPath).readAsStringSync();
    final treeBefore = treeOf(frontRoot);

    expect(
      () =>
          scaffolder().create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports'),
      throwsA(isA<ScaffoldException>()),
    );
    expect(File(pubspecPath).readAsStringSync(), pubspecBefore);
    expect(treeOf(frontRoot), treeBefore);
  });

  test('an invalid id throws and creates nothing', () {
    final pubspecBefore = File(pubspecPath).readAsStringSync();

    expect(
      () =>
          scaffolder(id: 'Bad')
              .create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports'),
      throwsA(isA<ScaffoldException>()),
    );
    expect(
      Directory('${frontRoot.path}/microfrontends/Bad').existsSync(),
      isFalse,
    );
    expect(File(pubspecPath).readAsStringSync(), pubspecBefore);
  });

  test('a front root without pubspec.yaml throws and creates nothing', () {
    File(pubspecPath).deleteSync();

    expect(
      () =>
          scaffolder().create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports'),
      throwsA(isA<ScaffoldException>()),
    );
    expect(
      Directory('${frontRoot.path}/microfrontends/reports').existsSync(),
      isFalse,
    );
  });

  test('an unknown placeholder in a template throws and creates nothing', () {
    final templates = Directory.systemTemp.createTempSync('bad_templates_');
    addTearDown(() => templates.deleteSync(recursive: true));
    File('${templates.path}/a.txt.tmpl').writeAsStringSync('{{nope}}');

    expect(
      () =>
          scaffolder(templates: TemplateDirectory(templates))
              .create(menuLabelEs: 'Reportes', menuLabelEn: 'Reports'),
      throwsA(isA<ScaffoldException>()),
    );
    expect(
      Directory('${frontRoot.path}/microfrontends/reports').existsSync(),
      isFalse,
    );
  });

  test('the fixture copies the real templates for the CLI', () {
    const TemplateFixture().copyInto(frontRoot);

    expect(
      File(
        '${frontRoot.path}/tools/new_microfrontend/templates/pubspec.yaml.tmpl',
      ).existsSync(),
      isTrue,
    );
  });
}
